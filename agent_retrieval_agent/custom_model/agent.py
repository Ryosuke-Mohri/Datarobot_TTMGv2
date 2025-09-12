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
# hi
import os
import re
from textwrap import dedent
from typing import Any, Dict, Optional, Union

import models
from config import Config
from core.document_loader import SUPPORTED_FILE_TYPES
from crewai import LLM, Agent, Crew, CrewOutput, Task
from flask import json
from helpers import CrewAIEventListener, create_inputs_from_completion_params
from openai.types.chat import CompletionCreateParams
from ragas.messages import AIMessage
from tool import (
    DocumentReadTool,
    FileListTool,
    KnowledgeBaseContentTool,
    KnowledgeBaseSearchTool,
)


class MyAgent:
    """MyAgent is a custom agent that uses CrewAI to plan, write, and edit content.
    It utilizes DataRobot's LLM Gateway or a specific deployment for language model interactions.
    This example illustrates 3 agents that handle content creation tasks, including planning, writing,
    and editing blog posts.
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
        """Initializes the MyAgent class with API key, base URL, model, and verbosity settings.

        Args:
            api_key: Optional[str]: API key for authentication with DataRobot services.
                Defaults to None, in which case it will use the DATAROBOT_API_TOKEN environment variable.
            api_base: Optional[str]: Base URL for the DataRobot API.
                Defaults to None, in which case it will use the DATAROBOT_ENDPOINT environment variable.
            model: Optional[str]: The LLM model to use.
                Defaults to None.
            verbose: Optional[Union[bool, str]]: Whether to enable verbose logging.
                Accepts boolean or string values ("true"/"false"). Defaults to True.
            timeout: Optional[int]: How long to wait for the agent to respond.
                Defaults to 90 seconds.
            **kwargs: Any: Additional keyword arguments passed to the agent.
                Contains any parameters received in the CompletionCreateParams.

        Returns:
            None
        """
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
        self.knowledge_base_files: Dict[str, dict[str, str]] = {}

    @property
    def api_base_litellm(self) -> str:
        """Returns a modified version of the API base URL suitable for LiteLLM.

        Strips 'api/v2/' or 'api/v2' from the end of the URL if present.

        Returns:
            str: The modified API base URL.
        """
        if self.api_base:
            return re.sub(r"api/v2/?$", "", self.api_base)
        return "https://api.datarobot.com"

    def model_factory(
        self,
        model: str | None = None,
        use_deployment: bool = True,
        auto_model_override: bool = True,
    ) -> LLM:
        """Returns the model to use for the LLM.

        If a model is provided, it will be used. Otherwise, the default model will be used.
        If use_deployment is True, the model will be used with the deployment ID
        from the config/environment variable LLM_DEPLOYMENT_ID. If False, it will use the
        LLM Gateway.

        Args:
            model: Optional[str]: The model to use. If none, it defaults to config.llm_default_model.
            use_deployment: Optional[bool]: Whether to use the deployment ID from the config.
                Defaults to True.
            auto_model_override: Optional[bool]: If True, it will try and use the model
                specified in the request but automatically back out if the LLM Gateway is
                not available.

        Returns:
            str: The model to use.
        """
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
    def file_list_tool(self) -> FileListTool:
        return FileListTool()

    @property
    def document_read_tool(self) -> DocumentReadTool:
        return DocumentReadTool()

    @property
    def knowledge_base_content_tool(self) -> KnowledgeBaseContentTool:
        """Returns the KnowledgeBaseContentTool instance."""
        return KnowledgeBaseContentTool(knowledge_base=self.knowledge_base_files)

    @property
    def knowledge_base_search_tool(self) -> KnowledgeBaseSearchTool:
        """Returns the KnowledgeBaseSearchTool instance."""
        return KnowledgeBaseSearchTool(knowledge_base=self.knowledge_base_files)

    @property
    def agent_file_searcher(self) -> Agent:
        return Agent(
            role="File Searcher",
            goal='Find the most closely related filenames and their contents from a list of files on the topic: "{topic}" as it relates to the question: "{question}". Your services aren\'t needed if the document is in the question already.',
            backstory="You are an expert at searching and reading files for helpful information. You can identify the most relevant"
            "file from a list of files. You are given a list of files and a topic. ",
            allow_delegation=False,
            verbose=self.verbose,
            max_iter=3,
            llm=self.model_factory(
                model="datarobot/anthropic/claude-sonnet-4-20250514",
                use_deployment=True,
            ),
        )

    @property
    def task_file_search(self) -> Task:
        return Task(
            name="File List",
            description=dedent(
                """
                Find the most relevant files to "{topic}" and "{question}" from a list of files.
                You should always use your tools to determine what files are available.
                Your task is complete if no files are relevant.

                The chance that the files are relevant is quite low,
                so you should only select files if they are very clearly relevant.
                Please return only filenames that have extensions in the approved extension list.
                This extension list is: """
                + str(SUPPORTED_FILE_TYPES)
                + """.

                If no relevant files are found, return an empty array.
            """
            ).strip(),
            expected_output="A JSON object with an array of file paths",
            output_pydantic=models.FileSearchOutput,
            agent=self.agent_file_searcher,
            tools=[self.file_list_tool],
        )

    @property
    def task_write(self) -> Task:
        return Task(
            name="File Read",
            description=dedent("""
                1. Read the contents of the files you are given.
                2. Think and understand deeply the contents of the file.
                3. Determine the best way to summarize this information in a concise and understandable way.
                4. Create a summary that answers the question, "{question}".

                It is extremely critical that you do your best to answer this question.
                If no file was provided by the file searcher, state 'No file content available to answer the question.'
            """).strip(),
            expected_output="A well-written summary that answers the question in markdown format, or a clear statement if no file content is available.",
            agent=self.agent_file_searcher,
            tools=[self.document_read_tool],
        )

    @property
    def document_in_question_agent(self) -> Agent:
        """An agent that can be used to answer questions about a document."""
        return Agent(
            role="Document Question Answerer",
            goal=dedent("""
                If the question: "{question}" contains the phrase:
                "Here are the relevant documents with each document separated by three dashes",
                then you should read the pages of the documents from the question and answer the question prior to that phrase.
            """).strip(),
            backstory=dedent("""
                You are an expert at reading documents and answering questions about them, and when the question includes a document,
                you'll know you should take action to respond to it.
            """).strip(),
            allow_delegation=False,
            max_iter=5,
            verbose=self.verbose,
            llm=self.model_factory(
                model="datarobot/azure/gpt-4o-2024-11-20",
                use_deployment=True,
            ),
        )

    @property
    def task_in_question_write(self) -> Task:
        return Task(
            name="Embedded Document Question Answering",
            description=dedent("""
                1. Check if the "{question}" contains the phrase "Here is the relevant document with each page separated by three dashes:".
                2. If it does, separate the question from the document content.
                3. Think and understand deeply the contents of the document part of the question.
                4. Determine the best way to summarize this information in a concise and understandable way.
                5. Create a summary that answers the question part of "{question}".
                6. If the phrase is not found, respond with "No embedded document found in question."

                It is extremely critical that you do your best to answer this question.
            """).strip(),
            expected_output="A well-written summary in markdown format that answers the question using the embedded document, or a clear statement if no embedded document is found.",
            agent=self.document_in_question_agent,
        )

    @property
    def knowledge_base_agent(self) -> Agent:
        """An agent that searches through knowledge base files and answers questions using their content."""
        return Agent(
            role="Knowledge Base Specialist",
            goal=(
                "Given a knowledge base with files and limited content previews, first identify the most relevant files "
                'for answering the question: "{question}", then retrieve and analyze their full content to provide a comprehensive answer.'
            ),
            backstory=(
                "You are an expert at both analyzing file metadata and reading comprehensive document content. "
                "You can identify the most relevant files from knowledge base systems where full content isn't immediately available, "
                "and then synthesize information from multiple documents to provide accurate, well-sourced answers. "
                "You have a two-step process: first analyze file previews to select relevant files, then read their full content to answer questions."
            ),
            allow_delegation=True,
            verbose=self.verbose,
            max_iter=5,
            llm=self.model_factory(
                model="datarobot/vertex_ai/gemini-2.5-flash",
                use_deployment=True,
            ),
        )

    @property
    def task_knowledge_base_file_search(self) -> Task:
        return Task(
            name="Knowledge Base File Search",
            description=dedent("""
                Analyze the knowledge base `files` provided in this JSON:

                ``` {knowledge_base}```

                to identify which files are most relevant for answering the question: "{question}".
                If there is nothing in between the ``` and ``` symbols, respond with 'No knowledge base files available.'

                Look at file names, metadata, the topic "{topic}", and any content previews to make your determination.
                Select the most relevant files that would likely contain the information needed to answer the question.
                You select them by what is assigned the 'uuid' key in the knowledge base json list of files.

                DO NOT select any keys such as owner_uuid or project_uuid (these are not file UUIDs). Only the key 'uuid'.

                IMPORTANT: Format your response as a clear list of UUIDs, one per line, like:
                Selected UUIDs:
                - [actual-uuid-from-knowledge-base]
                - [actual-uuid-from-knowledge-base]

                Only use the actual UUIDs found in the provided knowledge base data.
            """).strip(),
            expected_output="A clearly formatted list of the most relevant file UUIDs from the knowledge base, with each UUID on its own line, or 'No knowledge base files available.'",
            output_pydantic=models.UUIDListOutput,
            agent=self.knowledge_base_agent,
        )

    @property
    def task_knowledge_base_content_answer(self) -> Task:
        return Task(
            description=dedent("""
                IMPORTANT: You have previously identified relevant file UUIDs in your previous task output.
                You must carefully examine the context from your previous task to extract these UUIDs.
                CRITICAL: You MUST use your tool to get the content from those files

                Using your full content tool is expensive, so be sure to search first using the UUIDs you found,
                and then decide if you need to read the full content.

                Your task:
                1. Look at the output from your previous Knowledge Base File Search task
                2. Find any lines that start with '- ' followed by a UUID in standard format
                3. Extract ALL actual UUIDs from those lines (NOT the examples from instructions)
                4. Search the contents of those UUIDs using keywords and/or regex patterns from the question
                5. If you do not have UUIDs, use search to find them.
                5. Use the search results to determine which files are most relevant from the list of UUIDs
                6. Use the knowledge base content tool with the extracted UUIDs as a list if you think the search
                   results weren't sufficient to answer the question properly
                7. Read and understand the content deeply
                8. Create a comprehensive answer to the question: "{question}" on the topic "{topic}"

                CRITICAL INSTRUCTIONS:
                - Never call the tool with an empty list
                - Only call the tool with UUIDs you extracted from your previous output
                - Never call the Knowledge Base Content Tool more than once!!!
                - Ignore any example UUIDs from instructions or documentation
                - If no UUIDs were found in your previous output, respond that no relevant files were identified
            """).strip(),
            expected_output="A comprehensive, well-formatted markdown summary answering the question using the knowledge base content.",
            agent=self.knowledge_base_agent,
            tools=[self.knowledge_base_content_tool, self.knowledge_base_search_tool],
        )

    @property
    def finalizer_agent(self) -> Agent:
        """An agent that coordinates and finalizes the outputs from all other agents."""
        return Agent(
            role="Response Finalizer",
            goal=(
                "Analyze the outputs from all previous agents and provide a single, coherent, well-formatted answer to the question: "
                '"{question}" from the topic: "{topic}"'
            ),
            backstory=(
                "You are an expert coordinator who takes the work from multiple specialized agents "
                "and creates a final, polished response. You can determine which agent provided the "
                "most relevant information and synthesize multiple sources when needed. "
                "You never output raw tool results, full documents, or incomplete information."
            ),
            max_iter=5,
            allow_delegation=False,
            verbose=self.verbose,
            llm=self.model_factory(
                model="datarobot/vertex_ai/gemini-2.5-flash",
                use_deployment=True,
            ),
        )

    @property
    def task_finalize_response(self) -> Task:
        return Task(
            description=dedent("""
                Analyze all the outputs from the previous agents and create a single, coherent answer to: "{question}".

                You have access to:
                1. File search results and file-based content analysis
                2. Embedded document analysis (if present in the question)
                3. Knowledge base search and content analysis

                Your job is to:
                1. Determine which agents found relevant information
                2. Synthesize the most relevant and accurate information
                3. Create a well-formatted, comprehensive response
                4. Ignore any 'not available' or 'not found' responses
                5. If multiple sources provide information, combine them intelligently
                6. If no sources provide useful information, clearly state that no relevant information was found

                Never output raw tool results, file paths, or technical details - only the final answer.
            """).strip(),
            expected_output="A single, well-formatted markdown response that directly answers the user's question using the most relevant information found by all agents.",
            agent=self.finalizer_agent,
        )

    def crew(self) -> Crew:
        return Crew(
            agents=[
                self.agent_file_searcher,
                self.document_in_question_agent,
                self.knowledge_base_agent,
                self.finalizer_agent,
            ],
            tasks=[
                self.task_file_search,
                self.task_write,
                self.task_in_question_write,
                self.task_knowledge_base_file_search,
                self.task_knowledge_base_content_answer,
                self.task_finalize_response,
            ],
            verbose=self.verbose,
        )

    def _extract_and_store_knowledge_base_content(self, base: dict[str, Any]) -> None:
        """Extracts and stores the encoded content from knowledge base files."""
        for file_info in base["files"]:
            file_uuid = file_info["uuid"]
            if "encoded_content" in file_info:
                if not file_info["encoded_content"]:
                    # This shouldn't happen in prod, but if you don't have libreoffice installed,
                    # or persistence of the KB is missing it can happen.
                    continue
                self.knowledge_base_files[file_uuid] = file_info["encoded_content"]
                del file_info[
                    "encoded_content"
                ]  # Remove encoded_content from working inputs
                file_info["encoded_content"] = self.knowledge_base_files[file_uuid].get(
                    "1", ""
                )[:500]  # preview

    def run(
        self, completion_create_params: CompletionCreateParams
    ) -> tuple[CrewOutput, list[Any]]:
        """Run the agent with the provided completion parameters.

        [THIS METHOD IS REQUIRED FOR THE AGENT TO WORK WITH DRUM SERVER]

        Inputs can be extracted from the completion_create_params in several ways. A helper function
        `create_inputs_from_completion_params` is provided to extract the inputs as json or a string
        from the 'user' portion of the input prompt. Alternatively you can extract and use one or
        more inputs or messages from the completion_create_params["messages"] field.

        Args:
            completion_create_params (CompletionCreateParams): The parameters for
                the completion request, which includes the input topic and other settings.
        Returns:
            tuple[CrewOutput, list[Any]]: A tuple containing a list of messages (events) and the crew output.

        """
        # Example helper for extracting inputs as a json from the completion_create_params["messages"]
        # field with the 'user' role: (e.g. {"topic": "Artificial Intelligence"})
        inputs = create_inputs_from_completion_params(completion_create_params)
        # If inputs are a string, convert to a dictionary with 'topic' key for this example.
        if isinstance(inputs, str):
            inputs = {"topic": inputs}

        # If you want to use the inputs for training, you can uncomment this
        #
        # with open("agent_inputs.json", "w") as f:
        #     json.dump(inputs, f, indent=4)

        # Handle knowledge base content extraction and storage
        if "knowledge_base" in inputs:
            # Extract and store encoded_content, remove from working inputs
            self._extract_and_store_knowledge_base_content(inputs["knowledge_base"])
            self.knowledge_base_content_tool.knowledge_base = self.knowledge_base_files
            inputs["topic"] = inputs["knowledge_base"]["description"]
        else:
            inputs["knowledge_base"] = ""
        # Print commands may need flush=True to ensure they are displayed in real-time.
        print("Running agent with inputs:", flush=True)
        print(json.dumps(inputs, indent=4), flush=True)

        crew = self.crew()
        # Check if we are using training data
        output = crew.agents[0]._use_trained_data(".")
        if len(output) > 1:
            print("Using training data.", flush=True)
        # Run the crew with the inputs
        crew_output = crew.kickoff(inputs=inputs)

        # Extract the response text from the crew output
        response_text = str(crew_output.raw)

        # Create a list of events from the event listener
        events = self.event_listener.messages
        if len(events) > 0:
            last_message = events[-1].content
            if last_message != response_text:
                events.append(AIMessage(content=response_text))
        else:
            events = None
        # The `events` variable is used to compute agentic metrics
        # (e.g. Task Adherence, Agent Goal Accuracy, Agent Goal Accuracy with Reference,
        # Tool Call Accuracy).
        # If you are not interested in these metrics, you can also return None instead.
        # This will reduce the size of the response significantly.
        return crew_output, events
