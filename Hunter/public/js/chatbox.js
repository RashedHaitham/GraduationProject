const chatboxButton = document.querySelector('.chatbox-button');
const chatbox = document.querySelector('.chatbox');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.querySelector('.chatbox-messages');
const sendButton = document.getElementById('send-button');
const chatModal = document.getElementById('chatModal');
const closeModalButton = document.querySelector('.modal .btn-close');

chatboxButton.addEventListener('click', () => {
  console.log("clicked");
  $('#chatModal').modal('show'); // Use Bootstrap's modal function 
});

closeModalButton.addEventListener('click', () => {
  $('#chatModal').modal('hide');
});

// Function to get text width
function getTextWidth(text) {
  const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  context.font = "16px Arial"; // Adjust font size and style as needed
  const metrics = context.measureText(text);
  return metrics.width;
}

sendButton.addEventListener('click', sendMessage);
function sendMessage() {
  const message = chatInput.value;

  displayMessage('user', message); // Display the message as sent by the user

  // Fetch API response 

    fetch('https://getcody.ai/api/v1/messages', {
    method: 'POST',
    body: JSON.stringify({
        content: message,
        conversation_id: "QnXe00285exr"
    }),
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 9SofBEfYwtYVP2y9cQ2qHBS7b9R1eWgFue5cWB8u' 
    }
})
.then(response => {
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
})
.then(data => {
  console.log(data);
    const content = data.data.content;
    displayMessage('bot', content); 
})
.catch(error => {
    console.error('API Error:', error);
    // Display the error message
    displayMessage('bot', error.message); 
});
      chatInput.value = '';
}

function displayMessage(type, message) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', type === 'bot' ? 'bot-message' : 'user-message');
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
}
