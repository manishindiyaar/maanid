# AI Call Assistant System

This system allows you to make voice calls using natural language commands powered by VAPI AI and Anthropic Claude.

## Features

- **Natural Language Processing**: Parse commands like "call Manish and Aadidev and say we have job vacancy available for you now"
- **AI Voice Assistant**: Automatically creates VAPI assistants that deliver your message
- **Multiple Contact Support**: Call multiple people with a single command
- **Demo Mode**: Test the system without actual API keys
- **Integrated Experience**: Call functionality is integrated directly into the main search interface

## How It Works

1. **Parse Query**: AI parses your natural language request using Anthropic Claude
2. **Create Assistant**: VAPI creates a voice assistant with your message
3. **Make Calls**: Assistant calls contacts and delivers the message

## Setup

### 1. Install Dependencies

The VAPI SDK is already installed. If you need to reinstall:

```bash
npm install @vapi-ai/server-sdk
```

### 2. Environment Variables

Add these to your `.env.local` file:

```env
# VAPI Configuration
VAPI_API_KEY=your_vapi_api_key_here
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id_here

# Anthropic API (already configured)
ANTHROPIC_API_KEY=your_anthropic_key
```

### 3. Get VAPI Credentials

1. Sign up at [vapi.ai](https://vapi.ai)
2. Get your API key from the dashboard
3. Purchase a phone number and get the phone number ID

## Usage

### Access the Interface

Call functionality is integrated directly into the main search/query interface. Simply type your call command into any search box in the application.

### Example Commands

- `"call Manish and Aadidev and say we have job vacancy available for you now"`
- `"call Manish and tell him the meeting is scheduled for tomorrow"`
- `"call Aadidev and say the project deadline has been extended"`
- `"call Manish, Aadidev and inform them about the new policy update"`

### Contact Management

Currently, contacts are hardcoded in the API:

```typescript
const contacts = [
  { name: "Manish", phoneNumber: "+919801441675" },
  { name: "Aadidev", phoneNumber: "+919004200798" }
];
```

To add more contacts, edit the `contacts` array in `/src/app/api/make-call/route.ts`.

## API Endpoints

### POST /api/make-call

Make a call using natural language.

**Request:**
```json
{
  "query": "call Manish and say hello"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Initiated calls to 1 contact(s)",
  "parsedQuery": {
    "type": "call",
    "contacts": ["Manish"],
    "message": "hello"
  },
  "assistantId": "assistant_id",
  "calls": [
    {
      "contact": "Manish",
      "phoneNumber": "+919801441675",
      "callId": "call_id",
      "status": "initiated"
    }
  ]
}
```

### GET /api/make-call

Get system status and available contacts.

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── make-call/
│   │   │   └── route.ts          # Main API endpoint
│   │   └── anthropic/
│   │       ├── client.ts         # Original parser
│   │       └── call-parser.ts    # Enhanced call parser
└── components/
    ├── chat/
    │   ├── AdvancedSearchBar.tsx # Includes call functionality
    │   └── QueryInput.tsx        # Includes call functionality
    └── ui/                       # UI components
```

## Demo Mode

The system runs in demo mode when VAPI credentials are not configured. In demo mode:

- Queries are still parsed using AI
- Mock assistants and calls are created
- No actual phone calls are made
- All functionality can be tested

## Production Setup

For production use:

1. Configure real VAPI API key and phone number
2. Update contact database (consider using a real database)
3. Add error handling and logging
4. Implement call status tracking
5. Add authentication and authorization

## Extending the System

### Adding More Contact Sources

Replace the hardcoded contacts array with database queries:

```typescript
// Example: Load from database
const contacts = await getContactsFromDatabase();
```

### Enhanced Message Templates

Add support for message templates:

```typescript
const templates = {
  "job_opening": "We have a job opening that might interest you",
  "meeting_reminder": "Don't forget about our meeting tomorrow"
};
```

### Call Status Tracking

Implement webhooks to track call status:

```typescript
// Add webhook endpoint to track call completion
export async function POST(request: NextRequest) {
  const callStatus = await request.json();
  // Update database with call results
}
```

## Troubleshooting

### Common Issues

1. **Parsing Errors**: Make sure your query follows the pattern "call [names] and say/tell [message]"
2. **Contact Not Found**: Check that contact names match exactly (case-insensitive)
3. **VAPI Errors**: Verify your API key and phone number ID are correct

### Debug Mode

Enable debug logging by checking the browser console and server logs for detailed parsing information.

## Support

For issues with:
- VAPI integration: Check [VAPI documentation](https://docs.vapi.ai)
- Anthropic parsing: Check [Anthropic documentation](https://docs.anthropic.com)
- UI components: Check the component implementations in `/src/components/ui/`
