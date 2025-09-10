import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { userEvent } from '@testing-library/user-event';
import App from '@/App';
import { renderWithProviders } from './test-utils.tsx';
import { DEFAULT_LLM_CATALOG } from '@/api/chat/constants.ts';
import { AppState } from '@/state/types.ts';
import { PATHS } from '@/constants/paths.ts';

describe('Application', () => {
    it('renders the initial layout', async () => {
        renderWithProviders(<App />, {
            selectedLlmModel: DEFAULT_LLM_CATALOG[0],
            availableLlmModels: DEFAULT_LLM_CATALOG,
            selectedKnowledgeBaseId: null,
        } as AppState);

        const loader = screen.getByTestId('app-loader');
        expect(loader).toBeInTheDocument();

        await waitForElementToBeRemoved(() => screen.getByTestId('app-loader'));
        const header = screen.getByTestId('app-header');
        expect(header).toBeInTheDocument();

        const sidebar = screen.getByTestId('app-sidebar');
        expect(sidebar).toBeInTheDocument();

        const modelSelectorTrigger = await screen.findByTestId('dropdown-model-selector-trigger');
        expect(modelSelectorTrigger).toBeInTheDocument();
        expect(modelSelectorTrigger).toHaveTextContent('🧠 Intelligent Agent Crew');

        const chatPromptInput = await screen.findByTestId('chat-prompt-input');
        expect(chatPromptInput).toBeInTheDocument();
    });

    it('displays the current selected model', async () => {
        renderWithProviders(<App />, {
            selectedLlmModel: DEFAULT_LLM_CATALOG[0],
            availableLlmModels: DEFAULT_LLM_CATALOG,
            selectedKnowledgeBaseId: null,
        } as AppState);

        const modelName = await screen.findByTestId('app-model-name');
        expect(modelName).toHaveTextContent('🧠 Intelligent Agent Crew');

        const modelSelectorTrigger = screen.getByTestId('dropdown-model-selector-trigger');
        expect(modelSelectorTrigger).toBeInTheDocument();
        expect(modelSelectorTrigger).toHaveTextContent('🧠 Intelligent Agent Crew');

        await userEvent.click(modelSelectorTrigger);

        // Verify the current model appears in the dropdown
        const agentModelItem = await screen.findByTestId(
            'dropdown-model-selector-item-ttmdocs-agents'
        );
        expect(agentModelItem).toBeVisible();
        expect(agentModelItem).toHaveTextContent('🧠 Intelligent Agent Crew');

        // Click the same model (since it's the only one available)
        await userEvent.click(agentModelItem);
        expect(modelSelectorTrigger).toHaveTextContent('🧠 Intelligent Agent Crew');
        expect(modelName).toHaveTextContent('🧠 Intelligent Agent Crew');
    });

    it('modal dropdown should be hidden for on knowledge bases page', async () => {
        renderWithProviders(
            <App />,
            {
                selectedLlmModel: DEFAULT_LLM_CATALOG[0],
                availableLlmModels: DEFAULT_LLM_CATALOG,
                selectedKnowledgeBaseId: null,
            } as AppState,
            PATHS.KNOWLEDGE_BASES
        );

        expect(screen.queryByTestId('dropdown-model-selector-trigger')).not.toBeInTheDocument();
    });
});
