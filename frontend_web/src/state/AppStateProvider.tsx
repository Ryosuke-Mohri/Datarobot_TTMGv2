import React, { useReducer } from 'react';
import { AppState, AppStateData, LLM_MODEL } from './types';
import { reducer, createInitialState, actions } from './reducer';
import { AppStateContext } from './AppStateContext';

export const AppStateProvider: React.FC<{
    children: React.ReactNode;
    initialState?: AppStateData;
}> = ({ children, initialState }) => {
    const [state, dispatch] = useReducer(reducer, initialState ?? createInitialState());

    const setSelectedLlmModel = (model: LLM_MODEL) => {
        dispatch(actions.setSelectedLlmModel(model));
    };

    const setAvailableLlmModels = (models: LLM_MODEL[]) => {
        dispatch(actions.setAvailableLlmModels(models));
    };

    const setSelectedKnowledgeBaseId = (id: string | null) => {
        dispatch(actions.setSelectedKnowledgeBaseId(id));
    };

    const setShowRenameChatModalForId = (chatId: string | null) => {
        dispatch(actions.setShowRenameChatModalForId(chatId));
    };

    const contextValue: AppState = {
        ...state,
        setSelectedLlmModel,
        setAvailableLlmModels,
        setSelectedKnowledgeBaseId,
        setShowRenameChatModalForId,
    };

    return <AppStateContext.Provider value={contextValue}>{children}</AppStateContext.Provider>;
};
