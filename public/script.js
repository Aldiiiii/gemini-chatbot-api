const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

async function sendMessageToServer(message) {
  if (!message) return;
  appendMessage('bot', 'Gemini is thinking...'); // Temporary "thinking" message

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: message }),
    });

    // Remove the "thinking" message
    const thinkingMessage = chatBox.lastChild;
    if (thinkingMessage && thinkingMessage.classList.contains('bot') && thinkingMessage.textContent.includes('thinking...')) {
      chatBox.removeChild(thinkingMessage);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
      appendMessage('bot', `Error: ${response.status} ${errorData.message || response.statusText}`);
      return;
    }

    const data = await response.json();
    appendMessage('bot', data.reply); // Assuming your backend sends { reply: "Gemini's answer" }
  } catch (error) {
    // Remove the "thinking" message in case of network or other errors
    const thinkingMessage = chatBox.lastChild;
    if (thinkingMessage && thinkingMessage.classList.contains('bot') && thinkingMessage.textContent.includes('thinking...')) {
      chatBox.removeChild(thinkingMessage);
    }
    appendMessage('bot', 'Sorry, something went wrong. Please try again.');
    console.error('Error sending message:', error);
  }
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  input.value = '';

  await sendMessageToServer(userMessage);
});
function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}
