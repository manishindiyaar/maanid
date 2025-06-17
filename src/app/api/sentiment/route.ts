import { NextResponse } from 'next/server';

import Anthropic from '@anthropic-ai/sdk';
import { config } from './../../../lib/config';


const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});



export async function POST(request: Request) {
    try{
        const {query} = await request.json();

        if(!query || typeof query !== 'string'){

            return new NextResponse('Query is required and must be string',{
                status : 400,
                headers:{'Content-Type': 'text/plain'}
            });
        }

        const systemPrompt = `
        You are a sentiment analysis assistant. Analyze the sentiment of the provided text and return it as:
      - "positive"
      - "negative"
      - "neutral"
      
      Provide only the sentiment label as plain text, nothing else
        
        `;

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 100,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: query,
                }
            ]   
        });
        
        const sentiment = response.content[0].text.trim();

       return new NextResponse(sentiment,{
        status: 200,
        headers: {'Content-Type': 'text/plain'}
       });

        
    } catch (error) {
        console.error('Error in sentiment analysis', error);
        return new NextResponse(
            'Error analyzing sentiment',
            {
                status: 500,
                headers: {'Content-Type': 'text/plain'}
            }
        
        );

    }

}

export async function GET(){
  return NextResponse.json({
    message: 'This is a POST-only sentiment analysis endpoint',
    usage: 'Send a POST request with {"query": "your text here"}',
    example: {
        query: 'I love this product!',
    },
    returns: 
        'positive, negative, or neutral'
    
  }
);
}








