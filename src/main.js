
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const AdmZip = require('adm-zip');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        transparent: true,
        titleBarStyle: 'hidden',
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    win.on('maximize', () => {
        win.webContents.send('window-state', 'maximized');
    });

    win.on('unmaximize', () => {
        win.webContents.send('window-state', 'restored');
    });

    win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('open-zip-file', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Zip Files', extensions: ['zip'] }],
    });

    if (!filePaths || filePaths.length === 0) {
        return { error: 'No file selected' };
    }

    const filePath = filePaths[0];

    try {
        const zip = new AdmZip(filePath);
        const zipEntry = zip.getEntry('conversations.json');
        if (!zipEntry) {
            return { error: 'conversations.json not found in the zip file.' };
        }

        const jsonStr = zipEntry.getData().toString('utf8');
        const conversations = JSON.parse(jsonStr);
        
        // Process conversations to extract relevant data for the view
        const processedConversations = conversations.map(conv => {
            return {
                title: conv.title || 'Untitled Conversation',
                mapping: conv.mapping,
                currentNode: conv.current_node
            };
        });

        return { data: processedConversations };
    } catch (error) {
        console.error('Error processing zip file:', error);
        return { error: `Failed to process zip file: ${error.message}` };
    }
});

ipcMain.handle('extract-messages', (event, conversation) => {
    if (!conversation || !conversation.mapping || typeof conversation.mapping !== 'object') {
        return [];
    }

    const messages = [];
    let currentNode = conversation.currentNode;

    while (currentNode != null) {
        const node = conversation.mapping[currentNode];

        if (
            node.message &&
            node.message.content &&
            node.message.content.parts &&
            node.message.content.parts.length > 0 &&
            (node.message.author.role !== 'system' || (node.message.metadata && node.message.metadata.is_user_system_message))
        ) {
            let author = node.message.author.role;
            if (author === 'assistant' || author === 'tool') {
                author = 'assistant';
            }

            const textContent = node.message.content.parts.map(p => (typeof p === 'string' ? p : p.text || '')).join('\n');
            
            if (textContent.trim().length > 0) {
                 messages.push({ author, content: textContent });
            }
        }
        currentNode = node.parent;
    }
    
    messages.reverse(); // Chronological order

    // Pair up user and assistant messages
    const pairedMessages = [];
    for (let i = 0; i < messages.length - 1; i++) {
        if (messages[i].author === 'user' && messages[i+1].author === 'assistant') {
            pairedMessages.push({
                user: messages[i].content,
                assistant: messages[i+1].content
            });
            i++; // Skip the next message since it's already paired
        }
    }
    return pairedMessages;
});

ipcMain.on('window-control', (event, action) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    switch (action) {
        case 'minimize':
            win.minimize();
            break;
        case 'maximize':
            if (win.isMaximized()) {
                win.unmaximize();
            } else {
                win.maximize();
            }
            break;
        case 'close':
            win.close();
            break;
    }
});
