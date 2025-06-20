const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const fileInput = document.getElementById('file-input');
const selectedFileNameDisplay = document.getElementById('selected-file-name');
const toggleFileDropdownButton = document.getElementById('toggle-file-dropdown-button');
const fileTypeDropdown = document.getElementById('file-type-dropdown');
const chatBox = document.getElementById('chat-box');

async function sendMessageToServer(message, file) {
  // No need to check for message only, as we can send a file alone
  appendMessage('bot', 'Gemini is thinking...'); // Temporary "thinking" message

  const formData = new FormData();
  if (message) {
    formData.append('message', message);
  }
  if (file) {
    formData.append('file', file, file.name); // 'file' is the field name multer expects
  }

  // If nothing to send (e.g. user cleared both after typing/selecting)
  if (!message && !file) {
     const thinkingMessage = chatBox.lastChild;
    if (thinkingMessage && thinkingMessage.classList.contains('bot') && thinkingMessage.textContent.includes('thinking...')) {
      chatBox.removeChild(thinkingMessage);
    }
    return;
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: formData, // Browser will set Content-Type for FormData automatically
    });

    // Remove the "thinking" message
    const thinkingMessage = chatBox.lastChild;
    if (thinkingMessage && thinkingMessage.classList.contains('bot') && thinkingMessage.textContent.includes('thinking...')) {
      chatBox.removeChild(thinkingMessage);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
      // console.log(errorData.error)
      // appendMessage('bot', `Error: ${response.status} ${errorData.error || response.statusText}`);
      appendMessage('bot', `${errorData.error || response.statusText}`);
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

if (toggleFileDropdownButton && fileTypeDropdown) {
  toggleFileDropdownButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent click from immediately closing dropdown via document listener
    fileTypeDropdown.classList.toggle('active');
  });
}

if (fileInput && selectedFileNameDisplay) {
  fileInput.addEventListener('change', function () {
    if (this.files && this.files.length > 0) {
      selectedFileNameDisplay.textContent = this.files[0].name;
    } else {
      selectedFileNameDisplay.textContent = '';
    }
    if (fileTypeDropdown) {
      fileTypeDropdown.classList.remove('active'); // Close dropdown after selection
    }
  });
}

// Close dropdown if clicked outside
document.addEventListener('click', function(event) {
  if (fileTypeDropdown && toggleFileDropdownButton) {
    if (fileTypeDropdown.classList.contains('active') &&
        !toggleFileDropdownButton.contains(event.target) &&
        !fileTypeDropdown.contains(event.target)) {
      fileTypeDropdown.classList.remove('active');
    }
  }
});

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  const file = fileInput.files[0];

  if (!userMessage && !file) { // Require either a message or a file
    input.placeholder = "Please type a message or select a file.";
    return;
  }
  input.placeholder = "Type your message..."; // Reset placeholder

  appendMessage('user', userMessage + (file ? ` [File: ${file.name}]` : ''));
  input.value = '';
  fileInput.value = ''; // Clear the file input
  if (selectedFileNameDisplay) selectedFileNameDisplay.textContent = ''; // Clear displayed name
  if (fileTypeDropdown) fileTypeDropdown.classList.remove('active'); // Close dropdown

  await sendMessageToServer(userMessage, file);
});
function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);

  if (sender === 'bot') {
    // Process simple markdown for bot messages
    let htmlContent = "";
    // Split text into blocks (paragraphs or lists) separated by one or more blank lines
    const blocks = text.split(/\n\s*\n|\n(?=\s*\* )/); // Split by blank lines or before a new list starts

    blocks.forEach(block => {
      if (block.trim() === "") return;

      // Check if the block is a list (all lines start with * or are empty)
      const lines = block.split('\n');
      const isList = lines.every(line => line.trim().startsWith('* ') || line.trim() === '');

      if (isList && lines.some(line => line.trim().startsWith('* '))) {
        let currentListHtml = '<ul>';
        lines.forEach(line => {
          if (line.trim().startsWith('* ')) {
            let listItemContent = line.trim().substring(2);
            // Handle bold within list item
            listItemContent = listItemContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            listItemContent = listItemContent.replace(/__(.*?)__/g, '<strong>$1</strong>');
            currentListHtml += `<li>${listItemContent}</li>`;
          }
        });
        currentListHtml += '</ul>';
        htmlContent += currentListHtml;
      } else { // Treat as a paragraph
        let paragraphContent = block;
        // Handle bold within paragraph
        paragraphContent = paragraphContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        paragraphContent = paragraphContent.replace(/__(.*?)__/g, '<strong>$1</strong>');
        htmlContent += `<p>${paragraphContent.replace(/\n/g, '<br>')}</p>`;
      }
    });
    msg.innerHTML = htmlContent;
  } else {
    // For user messages, display as plain text
    msg.textContent = text;
  }

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}
