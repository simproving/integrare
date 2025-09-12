// Main entry point for the Trendyol-Oblio Integration application

import { App } from './ui/app';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new App();
        await app.init();
        console.log('Trendyol-Oblio Integration application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message error';
        errorDiv.textContent = 'Failed to initialize application. Please refresh the page.';
        
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            messageContainer.appendChild(errorDiv);
        }
    }
});

// Export types for use in other modules
export * from './models/trendyol';
export * from './models/oblio';
export * from './models/common';
export * from './models/storage';