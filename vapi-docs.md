Inbound customer support

Copy page

Build a banking customer support agent that can process inbound phone calls and assist with common banking issues.
Overview
Build a banking support agent with function tools, CSV knowledge bases, and voice test suites. The agent handles account verification, balance inquiries, and transaction history via phone calls.

Agent Capabilities:

Account lookup and verification via phone number
Balance and transaction history retrieval
What You’ll Build:

Retrieval tools and CSV knowledge bases for account/transaction data
Voice test suites for automated quality assurance
Inbound phone number configuration for 24/7 availability


Prerequisites
A Vapi account.

Scenario
We will be creating a customer support agent for VapiBank, a bank that wants to provide 24/7 support to consumers.

1. Create a Knowledge Base
1
Download the spreadsheets

Download accounts.csv

Download transactions.csv
2
Upload the files
Dashboard
TypeScript (Server SDK)
Python (Server SDK)
cURL
import { VapiClient } from "@vapi-ai/server-sdk";
import fs from 'fs';
const vapi = new VapiClient({ token: "YOUR_VAPI_API_KEY" });
async function uploadFile(filePath: string) {
  try {
    const file = await vapi.files.create({
      file: fs.createReadStream(filePath)
    });
    console.log(`File ${filePath} uploaded with ID: ${file.id}`);
    return file;
  } catch (error) {
    console.error(`Error uploading file ${filePath}:`, error);
    throw error;
  }
}
// Upload both files
const accountsFile = await uploadFile("accounts.csv");
const transactionsFile = await uploadFile("transactions.csv");
console.log(`Accounts file ID: ${accountsFile.id}`);
console.log(`Transactions file ID: ${transactionsFile.id}`);


2. Create an Assistant
Dashboard
TypeScript (Server SDK)
Python (Server SDK)
cURL
import { VapiClient } from "@vapi-ai/server-sdk";
const vapi = new VapiClient({ token: "YOUR_VAPI_API_KEY" });
const systemPrompt = `You are Tom, a friendly VapiBank customer support assistant. Help customers check balances and view recent transactions. Always verify identity with phone number first.`;
const assistant = await vapi.assistants.create({
  name: "Tom",
  firstMessage: "Hello, you've reached VapiBank customer support! My name is Tom, how may I assist you today?",
  model: {
    provider: "openai",
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: systemPrompt
      }
    ]
  },
  voice: {
    provider: "11labs",
    voice_id: "burt"
  }
});
console.log(`Assistant created with ID: ${assistant.id}`);

3. Configure an Assistant
1
Update the introduction message
Dashboard
TypeScript (Server SDK)
Python (Server SDK)
cURL
import { VapiClient } from "@vapi-ai/server-sdk";
const vapi = new VapiClient({ token: "YOUR_VAPI_API_KEY" });
const updatedAssistant = await vapi.assistants.update("YOUR_ASSISTANT_ID", {
  firstMessage: "Hello, you've reached VapiBank customer support! My name is Tom, how may I assist you today?"
});
console.log("First message updated successfully");

Update the system prompt
First, create this system prompt:

System Prompt

# VapiBank - Phone Support Agent Prompt
## Identity & Purpose
You are **Tom**, VapiBank's friendly, 24x7 phone-support voice assistant. Do not introduce yourself after the first message.
You help customers with account inquiries:
1. **Check balance**  
2. **View recent transactions**  
## Data Sources
You have access to CSV files with account and transaction data:
- **accounts.csv**: `account_id, name, phone_last4, balance, card_status, email`
- **transactions.csv**: transaction history for all accounts
## Available Tools
1. **lookup_account** → verify customer identity using phone number
2. **get_balance** → returns current balance for verified account
3. **get_recent_transactions** → returns recent transaction history
## Conversation Flow
1. **Greeting**  
> "Hello, you've reached VapiBank customer support! My name is Tom, how may I assist you today?"
2. **Account Verification**  
* After caller provides phone digits → call **lookup_account**
* Read back the returned `name` for confirmation
* If no match after 2 tries → apologize and offer to transfer
3. **Handle Request**  
Ask: "How can I help you today—check your balance or review recent transactions?"
**Balance** → call **get_balance** → read current balance
**Transactions** → call **get_recent_transactions** → summarize recent activity
4. **Close**  
> "Is there anything else I can help you with today?"  
If no → thank the caller and end the call
## Style & Tone
* Warm, concise, ≤ 30 words per reply
* One question at a time
* Repeat important numbers slowly and clearly
* Professional but friendly tone
## Edge Cases
* **No account match** → offer to transfer to human agent
* **Multiple requests** → handle each request, then ask if anything else needed
* **Technical issues** → apologize and offer callback or transfer
(Remember: only share account information with verified account holders.)

Then update your assistant:

Dashboard
TypeScript (Server SDK)
Python (Server SDK)
cURL
import { VapiClient } from "@vapi-ai/server-sdk";
const vapi = new VapiClient({ token: "YOUR_VAPI_API_KEY" });
// Use the system prompt from above
const systemPrompt = `# VapiBank - Phone Support Agent Prompt...`;
const updatedAssistant = await vapi.assistants.update("YOUR_ASSISTANT_ID", {
  model: {
    messages: [
      {
        role: "system",
        content: systemPrompt
      }
    ]
  }
});
console.log("System prompt updated successfully");


import { VapiClient } from "@vapi-ai/server-sdk";
const vapi = new VapiClient({ token: "YOUR_VAPI_API_KEY" });
async function updateAssistantLLMSettings(assistantId: string) {
  const updatedAssistant = await vapi.assistants.update(assistantId, {
    model: {
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 150,
      messages: [
        {
          role: "system",
          content: "You are Tom, VapiBank's customer support assistant..."
        }
      ]
    }
  });
  return updatedAssistant;
}
// Update LLM settings
const assistant = await updateAssistantLLMSettings('YOUR_ASSISTANT_ID');
console.log('Assistant LLM settings updated');

Publish your assistant
Dashboard only: Click Publish to save your changes.

When using the Server SDKs, changes are applied immediately when you make API calls. There’s no separate “publish” step required.

5
Test your assistant
Dashboard
TypeScript (Server SDK)
Python (Server SDK)
cURL
Click Talk to Assistant to test it out.

Add Tools to an Assistant

import { VapiClient } from "@vapi-ai/server-sdk";

const vapi = new VapiClient({ token: "YOUR_VAPI_API_KEY" });

// Step 1: Create the account lookup tool
const lookupAccountTool = await vapi.tools.create({
  type: "function",
  function: {
    name: "lookup_account",
    description: "Look up account based on provided name and last 4 digits of the phone number."
  },
  knowledgeBases: [
    {
      name: "accounts",
      description: "Use this to retrieve account information",
      fileIds: ["YOUR_ACCOUNTS_FILE_ID"]
    }
  ]
});

console.log(`Created lookup_account tool: ${lookupAccountTool.id}`);

// Step 2: Create the balance retrieval tool
const getBalanceTool = await vapi.tools.create({
  type: "function",
  function: {
    name: "get_balance",
    description: "Retrieve the balance for an account based on provided account holder name and last 4 digits of the phone number."
  },
  knowledgeBases: [
    {
      name: "accounts",
      description: "Use this to retrieve account information",
      fileIds: ["YOUR_ACCOUNTS_FILE_ID"]
    }
  ]
});

console.log(`Created get_balance tool: ${getBalanceTool.id}`);

// Step 3: Create the transactions retrieval tool
const getTransactionsTool = await vapi.tools.create({
  type: "function",
  function: {
    name: "get_recent_transactions",
    description: "Return the three most recent transactions for a specific account."
  },
  knowledgeBases: [
    {
      name: "accounts",
      description: "Use this to retrieve account information",
      fileIds: ["YOUR_ACCOUNTS_FILE_ID"]
    },
    {
      name: "transactions",
      description: "Use this to retrieve transactions",
      fileIds: ["YOUR_TRANSACTIONS_FILE_ID"]
    }
  ]
});

console.log(`Created get_recent_transactions tool: ${getTransactionsTool.id}`);

// Step 4: Add all tools to the assistant
const updatedAssistant = await vapi.assistants.update("YOUR_ASSISTANT_ID", {
  model: {
    toolIds: [
      lookupAccountTool.id,
      getBalanceTool.id,
      getTransactionsTool.id
    ]
  }
});

console.log("All tools added to assistant successfully!");


import { VapiClient } from "@vapi-ai/server-sdk";

const vapi = new VapiClient({ token: "YOUR_VAPI_API_KEY" });

const testSuite = await vapi.testSuites.create({
  name: "Support Hotline Test Suite",
  assistantId: "YOUR_ASSISTANT_ID",
  phoneNumberId: "YOUR_PHONE_NUMBER_ID",
  testCases: [
    {
      name: "Account verification and balance check",
      description: "Test that the assistant can verify a customer account using phone number, retrieve their current balance, and provide recent transaction history.",
      steps: [
        {
          type: "userMessage",
          content: "Hi, I need to check my account balance"
        },
        {
          type: "assertion",
          condition: "Assistant asks for phone number verification"
        },
        {
          type: "userMessage",
          content: "My phone number ends in 1234"
        },
        {
          type: "assertion",
          condition: "Assistant provides balance information"
        }
      ]
    }
  ]
});

console.log(`Test suite created with ID: ${testSuite.id}`);
