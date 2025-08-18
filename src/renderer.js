
const converter = new showdown.Converter({ tables: true, strikethrough: true, tasklists: true });

document.addEventListener('DOMContentLoaded', () => {
    const loadZipBtn = document.getElementById('load-zip-btn');
    const masterList = document.getElementById('master-list');
    const detailView = document.getElementById('detail-view');

    let conversations = [];

    loadZipBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.openZipFile();
        if (result.error) {
            detailView.innerHTML = `<p>Error: ${result.error}</p>`;
            return;
        }
        conversations = result.data;
        renderMasterList();
    });

    function renderMasterList() {
        masterList.innerHTML = '';
        conversations.forEach((conv, index) => {
            const li = document.createElement('li');
            li.textContent = conv.title;
            li.dataset.index = index;
            li.addEventListener('click', async (event) => {
                document.querySelectorAll('#master-list li').forEach(item => item.classList.remove('selected'));
                event.currentTarget.classList.add('selected');
                
                const selectedIndex = event.currentTarget.dataset.index;
                const selectedConv = conversations[selectedIndex];
                renderDetailView(selectedConv);
            });
            masterList.appendChild(li);
        });
    }

    async function renderDetailView(conv) {
        detailView.innerHTML = '<p>Loading messages...</p>';
        const messagePairs = await window.electronAPI.extractMessages(conv);

        if (messagePairs.length === 0) {
            detailView.innerHTML = '<p>No user-assistant message pairs found in this conversation.</p>';
            return;
        }

        detailView.innerHTML = '';
        messagePairs.forEach(pair => {
            const pairDiv = document.createElement('div');
            pairDiv.className = 'message-pair';

            const userBubble = document.createElement('div');
            userBubble.className = 'message-bubble user-bubble';
            userBubble.textContent = pair.user;

            const assistantBubble = document.createElement('div');
            assistantBubble.className = 'message-bubble assistant-bubble';
            assistantBubble.innerHTML = converter.makeHtml(pair.assistant);

            pairDiv.appendChild(userBubble);
            pairDiv.appendChild(assistantBubble);
            detailView.appendChild(pairDiv);
        });
    }
});
