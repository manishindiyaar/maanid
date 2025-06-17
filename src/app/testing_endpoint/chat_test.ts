// async function testChat() {
//     const response = await fetch('http://localhost:3000/api/chat', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         message: 'Hi, how can you help me today?',
//         conversationHistory: []
//       })
//     });
//     const data = await response.json();
//     console.log('Response:', JSON.stringify(data, null, 2));
//   }
  
//   testChat();




async function testChat() {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hi, who are you?',
        conversationHistory: []
      })
    });
    const data = await response.text(); // Changed from .json() to .text()
    console.log('Response:', data);
    // in data, i getting the response from the api, output is like this:{"reply":"Hello! I'm an AI assistant created by Anthropic to be helpful, harmless, and honest. I'd be happy to assist you with a wide variety of tasks - from research and analysis to creative projects and problem-solving. Is there anything specific I can help you with today? I'll do my best to provide useful and informative responses.","timestamp":"2025-03-13T08:52:23.762Z","status":"success"}
    // i want to get only the reply part of the response
    const reply = JSON.parse(data).reply;
    console.log(reply);
    // i want to return the reply
    return reply;
   
  }
  
  testChat();