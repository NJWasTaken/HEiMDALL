// Preload script - runs before web content loads
// This creates a secure bridge between Electron and the web page

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electron',
    {
        // Add any specific APIs you want to expose to the frontend
        // For now, we'll keep it minimal since your app doesn't need special Electron features
        platform: process.platform,
        isElectron: true,
        
        // Example: You could add functions to communicate with main process
        // send: (channel, data) => {
        //     ipcRenderer.send(channel, data);
        // },
        // on: (channel, func) => {
        //     ipcRenderer.on(channel, (event, ...args) => func(...args));
        // }
    }
);

// Log that preload script loaded successfully
console.log('Preload script loaded successfully');
