


# we are building the cursor of customer support (AI copilot for customer support.)

Powered by AWS Bedrock and Sambanova 

![AWS](/public/images/hacy_cover.png)




We’re revolutionising how businesses handle communication by replacing entire customer service departments with a single copilot box.

We are developing what we call a mini-AGI system - autonomous AI agents that work together like human team. 

It's as simple as typing: "send message to all the people who have sent dm regarding the job opening for SDE. Yes, we have one available. Please send your CV." - and watching our AI spring into action.  


![Querybox wireframe](/Idea/querybox_wireframe.png)


It is so much powerfull we have finally reimagined how customer support can become 10x more efficient , yes You can say it's cursor for Customer Support.

![AdvancceQueryBox](/public/images/BLQuery1.png)

Behind the seen we are using Bedrock Claude Models and it gave great result.
![QueryBox](/Idea/qb1_wireframe.png)
![QueryBox](/Idea/queryboxmechanism.png)

```
  const bedrock = new BedrockClient({
    region: region,
    credentials: credentials,
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
  });
```








