import { AppStateData, Action, LLM_MODEL } from './types';
import { ACTION_TYPES, DEFAULT_VALUES, STORAGE_KEYS } from './constants';
import { getStorageItem, removeStorageItem, setStorageItem } from './storage';

export const createInitialState = (): AppStateData => {
    return {
        selectedLlmModel: getStorageItem(STORAGE_KEYS.SELECTED_LLM_MODEL)
            ? JSON.parse(getStorageItem(STORAGE_KEYS.SELECTED_LLM_MODEL)!)
            : DEFAULT_VALUES.selectedLlmModel,
        selectedKnowledgeBaseId: getStorageItem(STORAGE_KEYS.SELECTED_KNOWLEDGE_BASE_ID)
            ? getStorageItem(STORAGE_KEYS.SELECTED_KNOWLEDGE_BASE_ID)
            : DEFAULT_VALUES.selectedKnowledgeBaseId,
        selectedExternalFileId: getStorageItem(STORAGE_KEYS.SELECTED_EXTERNAL_FILE_ID)
            ? getStorageItem(STORAGE_KEYS.SELECTED_EXTERNAL_FILE_ID)
            : DEFAULT_VALUES.selectedExternalFileId,
        availableLlmModels: null,
        showRenameChatModalForId: DEFAULT_VALUES.showRenameChatModalForId,
    };
};

export const reducer = (state: AppStateData, action: Action): AppStateData => {
    switch (action.type) {
        case ACTION_TYPES.SET_SELECTED_LLM_MODEL:
            setStorageItem(STORAGE_KEYS.SELECTED_LLM_MODEL, JSON.stringify(action.payload));
            return {
                ...state,
                selectedLlmModel: action.payload,
            };
        case ACTION_TYPES.SET_AVAILABLE_LLM_MODELS:
            return {
                ...state,
                availableLlmModels: action.payload,
            };
        case ACTION_TYPES.SET_SELECTED_KNOWLEDGE_BASE_ID:
            if (!action.payload.id) {
                removeStorageItem(STORAGE_KEYS.SELECTED_KNOWLEDGE_BASE_ID);
            } else {
                setStorageItem(STORAGE_KEYS.SELECTED_KNOWLEDGE_BASE_ID, action.payload.id);
            }
            return {
                ...state,
                selectedKnowledgeBaseId: action.payload.id,
            };
        case ACTION_TYPES.SET_SELECTED_EXTERNAL_FILE_ID:
            if (!action.payload.id) {
                removeStorageItem(STORAGE_KEYS.SELECTED_EXTERNAL_FILE_ID);
            } else {
                setStorageItem(STORAGE_KEYS.SELECTED_EXTERNAL_FILE_ID, action.payload.id);
            }
            return {
                ...state,
                selectedExternalFileId: action.payload.id,
            };
        case ACTION_TYPES.SET_SHOW_RENAME_CHAT_MODAL_FOR_ID:
            return {
                ...state,
                showRenameChatModalForId: action.payload.chatId,
            };
        default:
            return state;
    }
};

export const actions = {
    setSelectedLlmModel: (model: LLM_MODEL): Action => ({
        type: ACTION_TYPES.SET_SELECTED_LLM_MODEL,
        payload: model,
    }),
    setAvailableLlmModels: (models: LLM_MODEL[]): Action => ({
        type: ACTION_TYPES.SET_AVAILABLE_LLM_MODELS,
        payload: models,
    }),
    setSelectedKnowledgeBaseId: (id: string | null): Action => ({
        type: ACTION_TYPES.SET_SELECTED_KNOWLEDGE_BASE_ID,
        payload: { id },
    }),
    setSelectedExternalFileId: (id: string | null): Action => ({
        type: ACTION_TYPES.SET_SELECTED_EXTERNAL_FILE_ID,
        payload: { id },
    }),
    setShowRenameChatModalForId: (chatId: string | null): Action => ({
        type: ACTION_TYPES.SET_SHOW_RENAME_CHAT_MODAL_FOR_ID,
        payload: { chatId },
    }),
};
