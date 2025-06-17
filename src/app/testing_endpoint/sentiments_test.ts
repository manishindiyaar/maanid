async function testSentiment() {
    const response = await fetch('http://localhost:3000/api/sentiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'I love this product!'
      })
    });
    const sentiment = await response.text();
    console.log('Sentiment:', sentiment);
  }
  
  testSentiment();