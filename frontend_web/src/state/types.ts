export type ValueOf<T> = T[keyof T];

export interface KnowledgeBaseSchema {
    uuid: string;
    title: string;
    description: string;
    token_count: number;
    path: string;
    created_at: string;
    updated_at: string;
    owner_uuid: string;
    files: Array<{
        uuid: string;
        filename: string;
        source: string;
        added: string;
        owner_uuid: string;
    }>;
}

export interface AppStateData {
    selectedLlmModel: LLM_MODEL;
    selectedKnowledgeBaseId: string | null;
    availableLlmModels: LLM_MODEL[] | null;
    showRenameChatModalForId: string | null;
}

export interface AppStateActions {
    setSelectedLlmModel: (model: LLM_MODEL) => void;
    setSelectedKnowledgeBaseId: (id: string | null) => void;
    setAvailableLlmModels: (availableLlmModels: LLM_MODEL[]) => void;
    setShowRenameChatModalForId: (chatId: string | null) => void;
}

export type AppState = AppStateData & AppStateActions;

export type Action =
    | { type: 'SET_SELECTED_LLM_MODEL'; payload: LLM_MODEL }
    | { type: 'SET_AVAILABLE_LLM_MODELS'; payload: LLM_MODEL[] }
    | { type: 'SET_SELECTED_KNOWLEDGE_BASE_ID'; payload: { id: string | null } }
    | { type: 'SET_SHOW_RENAME_CHAT_MODAL_FOR_ID'; payload: { chatId: string | null } };

export type LLM_MODEL = {
    name: string;
    model: string;
    llmId: string;
    isActive: boolean;
    isDeprecated: boolean;
};
