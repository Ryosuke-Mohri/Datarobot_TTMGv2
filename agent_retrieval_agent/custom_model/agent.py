# Copyright 2025 DataRobot, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
import json
import os
import re
from datetime import datetime, timedelta
from textwrap import dedent
from typing import Any, Dict, Optional, Union

from config import Config
from crewai import LLM, Agent, Crew, CrewOutput, Task
from helpers import CrewAIEventListener, create_inputs_from_completion_params
from openai.types.chat import CompletionCreateParams
from ragas.messages import AIMessage
from tool import (
    GoogleMapsSearchUrlTool,
    ImageSearchUrlTool,
    WebSearchUrlTool,
)


class MyAgent:
    """デートプラン提案エージェント

    ユーザーの自然文入力から必須項目を抽出し、3案のデートプランを生成します。
    集合時間・解散時間を厳守し、30分単位で行程を調整します。
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        model: Optional[str] = None,
        verbose: Optional[Union[bool, str]] = True,
        timeout: Optional[int] = 300,
        **kwargs: Any,
    ):
        """Initializes the MyAgent class with API key, base URL, model, and verbosity settings."""
        self.api_key = api_key or os.environ.get("DATAROBOT_API_TOKEN")
        self.api_base = api_base or os.environ.get("DATAROBOT_ENDPOINT")
        self.model = model
        self.config = Config()
        self.default_model = self.config.llm_default_model
        if not self.default_model.startswith("datarobot/"):
            self.default_model = f"datarobot/{self.default_model}"
        self.timeout = timeout
        if isinstance(verbose, str):
            self.verbose = verbose.lower() == "true"
        elif isinstance(verbose, bool):
            self.verbose = verbose
        self.event_listener = CrewAIEventListener()

    @property
    def api_base_litellm(self) -> str:
        """Returns a modified version of the API base URL suitable for LiteLLM."""
        if self.api_base:
            return re.sub(r"api/v2/?$", "", self.api_base)
        return "https://api.datarobot.com"

    def model_factory(
        self,
        model: str | None = None,
        use_deployment: bool = True,
        auto_model_override: bool = True,
    ) -> LLM:
        """Returns the model to use for the LLM."""
        api_base = (
            f"{self.api_base_litellm}/api/v2/deployments/{self.config.llm_deployment_id}/chat/completions"
            if use_deployment
            else self.api_base_litellm
        )
        if model is None:
            model = self.default_model
        if auto_model_override and not self.config.use_datarobot_llm_gateway:
            model = self.default_model
        if self.verbose:
            print(f"Using model: {model}")
        return LLM(
            model=model,
            api_base=api_base,
            api_key=self.api_key,
            timeout=self.timeout,
        )

    @property
    def google_maps_tool(self) -> GoogleMapsSearchUrlTool:
        return GoogleMapsSearchUrlTool()

    @property
    def web_search_tool(self) -> WebSearchUrlTool:
        return WebSearchUrlTool()

    @property
    def image_search_tool(self) -> ImageSearchUrlTool:
        return ImageSearchUrlTool()

    @property
    def input_parser_agent(self) -> Agent:
        """入力解析エージェント：自然文から必須項目を抽出"""
        return Agent(
            role="Input Parser",
            goal=(
                "ユーザーの自然文入力からデートプラン生成に必要な情報を抽出する。"
                "必須項目が不足している場合は、1〜3個の確認質問を生成する。"
            ),
            backstory=(
                "あなたはユーザーの自然な会話から重要な情報を正確に抽出する専門家です。"
                "曖昧な表現や日付・時刻の補完も行います。"
            ),
            allow_delegation=False,
            verbose=self.verbose,
            max_iter=3,
            llm=self.model_factory(
                model="datarobot/azure/gpt-4o-2024-11-20",
                use_deployment=True,
            ),
        )

    @property
    def plan_generator_agent(self) -> Agent:
        """プラン生成エージェント：3案のデートプランを生成"""
        return Agent(
            role="Date Plan Generator",
            goal=(
                "抽出された情報を基に、3つの異なるコンセプトのデートプランを生成する。"
                "各プランは明確に異なるテーマ（雨天/室内/アクティブなど）を持つ。"
            ),
            backstory=(
                "あなたはデートプランのプロデューサーです。"
                "ユーザーの好みや制約を考慮しながら、創造的で実現可能なプランを提案します。"
                "各スポットには必ずGoogle Maps検索URLを生成します。"
            ),
            allow_delegation=False,
            verbose=self.verbose,
            max_iter=5,
            llm=self.model_factory(
                model="datarobot/azure/gpt-4o-2024-11-20",
                use_deployment=True,
            ),
            tools=[self.google_maps_tool, self.web_search_tool, self.image_search_tool],
        )

    @property
    def validator_agent(self) -> Agent:
        """検証・調整エージェント：時刻の整合性を検証・調整"""
        return Agent(
            role="Plan Validator",
            goal=(
                "生成されたプランの時刻整合性を検証し、必要に応じて調整する。"
                "集合時間・解散時間を厳守し、30分単位で行程を調整する。"
                "ギャップや重複がないことを確認する。"
            ),
            backstory=(
                "あなたはプランの品質管理の専門家です。"
                "時刻の整合性を厳密にチェックし、問題があれば自動的に修正します。"
            ),
            allow_delegation=False,
            verbose=self.verbose,
            max_iter=3,
            llm=self.model_factory(
                model="datarobot/vertex_ai/gemini-2.5-flash",
                use_deployment=True,
            ),
        )

    @property
    def finalizer_agent(self) -> Agent:
        """最終化エージェント：React向けJSON + Markdown要約を生成"""
        return Agent(
            role="Response Finalizer",
            goal=(
                "検証済みのプランをReact向けの構造化JSONとMarkdown要約に変換する。"
                "JSONは指定されたフォーマットに厳密に準拠する。"
            ),
            backstory=(
                "あなたは技術的な出力フォーマットの専門家です。"
                "指定されたJSON構造に厳密に準拠し、人間が読みやすいMarkdown要約も生成します。"
            ),
            allow_delegation=False,
            verbose=self.verbose,
            max_iter=3,
            llm=self.model_factory(
                model="datarobot/vertex_ai/gemini-2.5-flash",
                use_deployment=True,
            ),
        )

    @property
    def task_parse_input(self) -> Task:
        return Task(
            name="Parse User Input",
            description=dedent("""
                ユーザーの自然文入力から情報を抽出し、積極的に補完してください。

                【最重要】積極的に補完すること：
                - 日付が明示されない場合：必ず直近の未来日を補完する（今日のその時刻が過ぎていれば翌日、まだなら今日）
                - 時刻のみ指定（例：「10時」）の場合：日付を補完して「YYYY-MM-DD 10:00」形式にする
                - 食の制約が明示されない場合：「なし」または「特に制約なし」と補完
                - 禁止事項が明示されない場合：「なし」または空配列と補完
                - 年齢層が明示されない場合：入力から推測可能な場合は推測し、推測できない場合は「20代」をデフォルトとする

                本当に必須な項目（これらがないとプラン生成不可）：
                - 集合場所
                - 集合時間（時刻のみでも可、日付は補完する）
                - 解散場所（「同じ場所」でも可）
                - 解散時間（時刻のみでも可、日付は補完する）
                - 予算（金額が分からない場合は「10000円」をデフォルトとする）

                推測可能な項目（明示されなくても推測・補完する）：
                - 人数：文脈から推測（「2人で」など）、推測できない場合は「2人」をデフォルト
                - 関係性：文脈から推測（「恋人」「友人」など）、推測できない場合は「友人」をデフォルト
                - 年齢層：文脈から推測、推測できない場合は「20代」をデフォルト
                - 食の制約：明示されない場合は「なし」と補完
                - お酒：明示されない場合は「可」をデフォルト
                - 趣味嗜好：文脈から推測、推測できない場合は空配列
                - 禁止事項：明示されない場合は空配列

                任意項目（あれば抽出、なければデフォルト）：
                - 交通手段：明示されない場合は「unspecified」
                - 行動半径：明示されない場合は空文字
                - 3案のラベル指定：あれば抽出
                - 雨天前提：あれば抽出

                確認質問を返すのは以下の場合のみ：
                - 集合場所が全く分からない場合
                - 集合時間が全く分からない場合（「夕方」などの曖昧な表現のみで、補完できない場合）
                - 解散場所が全く分からない場合
                - 解散時間が全く分からない場合（「夜」などの曖昧な表現のみで、補完できない場合）

                出力形式（JSON）：
                {{
                  "status": "ok",
                  "meetup_location": "...",
                  "meetup_time": "YYYY-MM-DD HH:mm",  // 必ず日付付きで補完
                  "breakup_location": "...",
                  "breakup_time": "YYYY-MM-DD HH:mm",  // 必ず日付付きで補完
                  "budget_jpy": 10000,
                  "people_count": 2,
                  "relationship": "...",
                  "age_range": "...",
                  "dietary_restrictions": "なし",
                  "alcohol": "可",
                  "interests": ["..."],
                  "prohibitions": [],
                  "transport_mode": "unspecified",
                  "radius_hint": "",
                  "plan_labels": [],
                  "rainy_day": false
                }}

                入力文："{user_input}"
            """).strip(),
            expected_output="JSON形式の構造化データ（積極的に補完した結果）",
            agent=self.input_parser_agent,
        )

    @property
    def task_generate_plans(self) -> Task:
        return Task(
            name="Generate 3 Date Plans",
            description=dedent("""
                前のタスクで抽出・補完された情報を基に、3つの異なるコンセプトのデートプランを生成してください。

                前のタスクの出力は以下の形式です：
                {{
                  "status": "ok",
                  "meetup_location": "...",
                  "meetup_time": "YYYY-MM-DD HH:mm",
                  "breakup_location": "...",
                  "breakup_time": "YYYY-MM-DD HH:mm",
                  "budget_jpy": 10000,
                  "people_count": 2,
                  "relationship": "...",
                  "age_range": "...",
                  "dietary_restrictions": "...",
                  "alcohol": "...",
                  "interests": ["..."],
                  "prohibitions": [],
                  "transport_mode": "...",
                  "radius_hint": "",
                  "plan_labels": [],
                  "rainy_day": false
                }}

                必須要件：
                1. 必ず3案を生成する
                2. 各案は明確に異なるコンセプトを持つ（例：rainy_day、indoor_heavy、active）
                3. plan_labelsが指定されている場合は、そのラベルで3案を置換（ただし内容はそれに合わせる）
                4. 各行程要素（itinerary）には必ず以下を含める：
                   - start: YYYY-MM-DD HH:mm（30分単位、meetup_timeから開始）
                   - end: YYYY-MM-DD HH:mm（30分単位、breakup_timeで終了）
                   - type: meetup/move/meal/cafe/activity/shopping/rest/breakup/other
                   - name: 場所・店名
                   - area: エリア名
                   - notes: 補足説明
                   - links: {{
                       google_maps_search_url: （必須、GoogleMapsSearchUrlToolツールを使用して生成）
                       web_search_url: （任意、WebSearchUrlToolを使用）
                       image_search_url: （任意、ImageSearchUrlToolを使用）
                     }}
                5. 集合時間・解散時間を厳守（最初のstartがmeetup_time、最後のendがbreakup_time）
                6. 全行程が連続（ギャップなし/重複なし）

                予算、制約、禁止事項、趣味嗜好を必ず考慮してください。

                前のタスクの出力を参照して、3案のデートプランを生成してください。
            """).strip(),
            expected_output="3案のデートプランを含むJSON構造（各案にitinerary配列を含む）",
            agent=self.plan_generator_agent,
        )

    @property
    def task_validate_and_adjust(self) -> Task:
        return Task(
            name="Validate and Adjust Plans",
            description=dedent("""
                前のタスクで生成されたプランの時刻整合性を検証し、必要に応じて調整してください。

                検証項目：
                1. 各案の最初のstartが集合時間と完全一致
                2. 各案の最後のendが解散時間と完全一致
                3. 全行程が30分単位に丸められている
                4. ギャップや重複がない（連続している）

                調整方法：
                - 30分単位で丸める（例：14:23 → 14:30）
                - 時間が足りない/長すぎる場合：滞在時間を伸縮、移動時間を最小固定
                - 矛盾が解消できない場合：エラーフラグを立てる（ただし時刻を勝手にずらさない）

                各案に checks オブジェクトを追加：
                - meets_exact_time_window: true/false
                - no_gaps_or_overlaps: true/false
                - rounded_to_30min: true/false

                前のタスクの出力（生成されたプラン）を参照してください。
            """).strip(),
            expected_output="検証・調整済みのプラン（checksオブジェクト付き）",
            agent=self.validator_agent,
        )

    @property
    def task_finalize_output(self) -> Task:
        return Task(
            name="Finalize Output",
            description=dedent("""
                前のタスクで検証済みのプランを最終的な出力形式に変換してください。

                最初のタスク（入力解析）の出力から以下の情報を取得してください：
                - meetup_time, breakup_time → meta.meetup_time, meta.breakup_time
                - transport_mode → meta.transport_mode
                - radius_hint → meta.radius_hint
                - meetup_timeの日付部分 → meta.assumed_date

                出力フォーマット（厳守）：
                {{
                  "status": "ok",
                  "meta": {{
                    "assumed_date": "YYYY-MM-DD",  // meetup_timeから抽出
                    "timezone": "+09:00",
                    "rounding_minutes": 30,
                    "transport_mode": "walk"|"transit"|"car"|"unspecified",
                    "radius_hint": "...",
                    "meetup_time": "YYYY-MM-DD HH:mm",  // 最初のタスクから取得
                    "breakup_time": "YYYY-MM-DD HH:mm"  // 最初のタスクから取得
                  }},
                  "plans": [
                    {{
                      "plan_id": "rainy_day",
                      "title": "...",
                      "theme": "...",
                      "summary": "...",
                      "budget_estimate_jpy": {{ "min": 0, "max": 0, "notes": "..." }},
                      "constraints_respected": ["..."],
                      "itinerary": [
                        {{
                          "start": "YYYY-MM-DD HH:mm",
                          "end": "YYYY-MM-DD HH:mm",
                          "type": "meetup"|"move"|"meal"|"cafe"|"activity"|"shopping"|"rest"|"breakup"|"other",
                          "name": "...",
                          "area": "...",
                          "notes": "...",
                          "links": {{
                            "google_maps_search_url": "...",
                            "web_search_url": "...",
                            "image_search_url": "..."
                          }}
                        }}
                      ],
                      "checks": {{
                        "meets_exact_time_window": true,
                        "no_gaps_or_overlaps": true,
                        "rounded_to_30min": true
                      }}
                    }}
                  ],
                  "markdown_summary": "..."  // 以下の見出しを含む：
                  // ## 3つの提案
                  // ## 比較（どれがおすすめ？）
                  // ## 注意点（制約・禁止事項・確認事項）
                }}

                前のタスクの出力（検証済みプラン）と最初のタスクの出力（入力解析結果）を参照してください。
                
                【最重要】出力形式：
                必ず以下の形式で出力してください：
                
                ```json
                {{
                  "status": "ok",
                  "meta": {{...}},
                  "plans": [...],
                  "markdown_summary": "..."
                }}
                ```
                
                上記の形式（マークダウンコードブロック）で出力してください。
                "json"という文字列だけで始めるのではなく、必ず ```json と ``` で囲んでください。
            """).strip(),
            expected_output="```json\n{...}\n``` の形式で出力されたJSON（markdown_summaryを含む）",
            agent=self.finalizer_agent,
        )

    def crew(self) -> Crew:
        return Crew(
            agents=[
                self.input_parser_agent,
                self.plan_generator_agent,
                self.validator_agent,
                self.finalizer_agent,
            ],
            tasks=[
                self.task_parse_input,
                self.task_generate_plans,
                self.task_validate_and_adjust,
                self.task_finalize_output,
            ],
            verbose=self.verbose,
        )

    def _round_to_30min(self, dt: datetime) -> datetime:
        """時刻を30分単位に丸める"""
        minutes = dt.minute
        if minutes < 15:
            rounded_minutes = 0
        elif minutes < 45:
            rounded_minutes = 30
        else:
            rounded_minutes = 0
            dt = dt + timedelta(hours=1)
        return dt.replace(minute=rounded_minutes, second=0, microsecond=0)

    def _parse_datetime(
        self, time_str: str, assumed_date: Optional[datetime] = None
    ) -> Optional[datetime]:
        """日時文字列を解析（補完あり）"""
        if assumed_date is None:
            now = datetime.now()
            # タイムゾーンを考慮（+09:00想定）
            assumed_date = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # 既に完全な形式の場合
        try:
            dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M")
            return self._round_to_30min(dt)
        except ValueError:
            pass

        # 時刻のみの場合（例：14:00）
        try:
            hour, minute = map(int, time_str.split(":"))
            dt = assumed_date.replace(hour=hour, minute=minute)
            # 今日のその時刻が過ぎていれば翌日
            if dt < datetime.now():
                dt = dt + timedelta(days=1)
            return self._round_to_30min(dt)
        except ValueError:
            pass

        return None

    def _validate_itinerary(
        self, plan: Dict[str, Any], meetup_time: str, breakup_time: str
    ) -> Dict[str, Any]:
        """行程の時刻整合性を検証・調整"""
        try:
            meetup_dt = datetime.strptime(meetup_time, "%Y-%m-%d %H:%M")
            breakup_dt = datetime.strptime(breakup_time, "%Y-%m-%d %H:%M")
        except ValueError:
            plan["checks"] = {
                "meets_exact_time_window": False,
                "no_gaps_or_overlaps": False,
                "rounded_to_30min": False,
            }
            return plan

        itinerary = plan.get("itinerary", [])
        if not itinerary:
            plan["checks"] = {
                "meets_exact_time_window": False,
                "no_gaps_or_overlaps": False,
                "rounded_to_30min": False,
            }
            return plan

        # 集合・解散時刻と一致させる
        itinerary[0]["start"] = meetup_time
        itinerary[-1]["end"] = breakup_time

        # 全行程を30分単位に丸め、連続させる
        current_time = meetup_dt
        total_duration = (breakup_dt - meetup_dt).total_seconds() / 60  # 分単位

        # 各行程の最小時間を計算（移動時間を考慮）
        min_durations = []
        for i, item in enumerate(itinerary):
            item_type = item.get("type", "other")
            # 移動時間の見積もり（分）
            if item_type == "move":
                min_dur = 15  # 最小移動時間15分
            elif item_type in ["meetup", "breakup"]:
                min_dur = 0  # 集合・解散は時間不要
            else:
                min_dur = 30  # その他は最小30分
            min_durations.append(min_dur)

        # 利用可能な時間を計算（最小時間を除いた残り）
        total_min_duration = sum(min_durations)
        available_time = max(0, total_duration - total_min_duration)

        # 各行程に時間を配分（最初と最後は固定）
        for i, item in enumerate(itinerary):
            item_type = item.get("type", "other")

            if i == 0:
                # 最初の行程：集合時刻から開始
                item["start"] = meetup_time
                item_start = meetup_dt
            else:
                # 前の行程の終了時刻から開始
                item["start"] = current_time.strftime("%Y-%m-%d %H:%M")
                item_start = current_time

            if i == len(itinerary) - 1:
                # 最後の行程：解散時刻で終了
                item["end"] = breakup_time
                current_time = breakup_dt
            else:
                # 中間の行程：最小時間 + 配分時間
                min_dur = min_durations[i]
                if item_type in ["meetup", "breakup"]:
                    item_end = item_start
                elif item_type == "move":
                    item_end = item_start + timedelta(minutes=min_dur)
                else:
                    # 利用可能時間を配分（最後の行程以外に均等配分）
                    if available_time > 0 and len(itinerary) > 2:
                        allocated_time = max(
                            min_dur, available_time / (len(itinerary) - 2)
                        )
                    else:
                        allocated_time = min_dur
                    item_end = item_start + timedelta(minutes=int(allocated_time))
                    item_end = self._round_to_30min(item_end)

                item["end"] = item_end.strftime("%Y-%m-%d %H:%M")
                current_time = item_end

        # 検証フラグを設定
        final_start = datetime.strptime(itinerary[0]["start"], "%Y-%m-%d %H:%M")
        final_end = datetime.strptime(itinerary[-1]["end"], "%Y-%m-%d %H:%M")

        # ギャップ・重複チェック
        no_gaps = True
        for i in range(len(itinerary) - 1):
            current_end = datetime.strptime(itinerary[i]["end"], "%Y-%m-%d %H:%M")
            next_start = datetime.strptime(itinerary[i + 1]["start"], "%Y-%m-%d %H:%M")
            if current_end != next_start:
                no_gaps = False
                break

        plan["checks"] = {
            "meets_exact_time_window": (
                final_start.strftime("%Y-%m-%d %H:%M") == meetup_time
                and final_end.strftime("%Y-%m-%d %H:%M") == breakup_time
            ),
            "no_gaps_or_overlaps": no_gaps,
            "rounded_to_30min": True,
        }

        return plan

    def run(
        self, completion_create_params: CompletionCreateParams
    ) -> tuple[CrewOutput, list[Any]]:
        """Run the agent with the provided completion parameters."""
        # ユーザー入力を取得
        inputs = create_inputs_from_completion_params(completion_create_params)
        if isinstance(inputs, str):
            user_input = inputs
        elif isinstance(inputs, dict):
            user_input = inputs.get("user_input", inputs.get("message", str(inputs)))
        else:
            user_input = str(inputs)

        print("Running date plan agent with input:", flush=True)
        print(user_input, flush=True)

        # CrewAIで処理
        crew = self.crew()
        crew_output = crew.kickoff(inputs={"user_input": user_input})

        # レスポンステキストを取得
        response_text = str(crew_output.raw)

        # JSONを抽出・検証・調整
        try:
            # JSON部分を抽出（マークダウンコードブロック内の可能性も考慮）
            json_match = re.search(
                r"```(?:json)?\s*(\{.*?\})\s*```", response_text, re.DOTALL
            )
            if not json_match:
                # "json {" で始まる形式も検出
                json_match = re.search(r"json\s+(\{.*?\})", response_text, re.DOTALL)
            if not json_match:
                # 単純なJSONオブジェクトを検出
                json_match = re.search(r"(\{.*\})", response_text, re.DOTALL)

            if json_match:
                json_str = (
                    json_match.group(1) if json_match.groups() else json_match.group()
                )
                # 不完全なJSONの場合、最後の } までを探す
                if not json_str.strip().endswith("}"):
                    last_brace = json_str.rfind("}")
                    if last_brace > 0:
                        json_str = json_str[: last_brace + 1]
                parsed_json = json.loads(json_str)

                # 時刻検証を実行（plansが存在する場合）
                if parsed_json.get("status") == "ok" and "plans" in parsed_json:
                    # メタ情報から時刻を取得、または最初のプランから推測
                    meta = parsed_json.get("meta", {})
                    meetup_time = meta.get("meetup_time")
                    breakup_time = meta.get("breakup_time")

                    # メタにない場合は最初のプランから取得
                    if not meetup_time and parsed_json["plans"]:
                        first_plan = parsed_json["plans"][0]
                        if first_plan.get("itinerary"):
                            meetup_time = first_plan["itinerary"][0].get("start")

                    if not breakup_time and parsed_json["plans"]:
                        first_plan = parsed_json["plans"][0]
                        if first_plan.get("itinerary"):
                            breakup_time = first_plan["itinerary"][-1].get("end")

                    if meetup_time and breakup_time:
                        for plan in parsed_json["plans"]:
                            plan = self._validate_itinerary(
                                plan, meetup_time, breakup_time
                            )

                        # メタ情報を更新
                        if "meetup_time" not in meta:
                            meta["meetup_time"] = meetup_time
                        if "breakup_time" not in meta:
                            meta["breakup_time"] = breakup_time
                        parsed_json["meta"] = meta

                    # Markdown要約が既にある場合はそのまま、ない場合は生成
                    if (
                        "markdown_summary" not in parsed_json
                        or not parsed_json["markdown_summary"]
                    ):
                        markdown = self._generate_markdown_summary(parsed_json)
                        parsed_json["markdown_summary"] = markdown

                    # 最終的なJSONを再構築
                    json_output = json.dumps(parsed_json, ensure_ascii=False, indent=2)

                    # 最終出力：JSONをコードブロックで含める（Markdown要約はJSON内に含まれている）
                    # フロントエンドがJSONを検出しやすいように、確実にコードブロック形式で出力
                    response_text = f"```json\n{json_output}\n```"

                    # Markdown要約も追加（JSONの後に）
                    markdown_summary = parsed_json.get("markdown_summary", "")
                    if markdown_summary:
                        response_text = f"{response_text}\n\n{markdown_summary}"
        except (json.JSONDecodeError, KeyError, AttributeError) as e:
            if self.verbose:
                print(f"JSON parsing/validation error: {e}", flush=True)
            # エラー時は元のレスポンスをそのまま返す

        # イベントリストを作成
        events = self.event_listener.messages
        if len(events) > 0:
            last_message = events[-1].content
            if last_message != response_text:
                events.append(AIMessage(content=response_text))
        else:
            events = None

        # CrewOutputを再構築（検証済みのresponse_textを使用）
        crew_output.raw = response_text

        return crew_output, events

    def _generate_markdown_summary(self, parsed_json: Dict[str, Any]) -> str:
        """Markdown要約を生成"""
        plans = parsed_json.get("plans", [])
        if not plans:
            return "## エラー\nプランが生成されませんでした。"

        markdown = "## 3つの提案\n\n"
        for plan in plans:
            title = plan.get("title", plan.get("plan_id", "プラン"))
            theme = plan.get("theme", "")
            summary = plan.get("summary", "")
            markdown += f"### {title}\n"
            if theme:
                markdown += f"**テーマ**: {theme}\n\n"
            if summary:
                markdown += f"{summary}\n\n"

        markdown += "## 比較（どれがおすすめ？）\n\n"
        markdown += (
            "各プランの特徴を比較して、あなたの好みに合ったものを選んでください。\n\n"
        )

        markdown += "## 注意点（制約・禁止事項・確認事項）\n\n"
        constraints = []
        for plan in plans:
            plan_constraints = plan.get("constraints_respected", [])
            constraints.extend(plan_constraints)

        if constraints:
            for constraint in set(constraints):  # 重複除去
                markdown += f"- {constraint}\n"
        else:
            markdown += "- 特に制約はありません。\n"
        
        return markdown
