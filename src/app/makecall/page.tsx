'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Phone, CheckCircle, XCircle, Users, AlertCircle } from 'lucide-react';

interface CallResult {
  contact: string;
  phoneNumber: string;
  callId: string | null;
  status: 'initiated' | 'failed';
  error?: string;
}

interface CallResponse {
  success: boolean;
  message: string;
  parsedQuery: {
    type: string;
    contacts: string[];
    message: string;
  };
  assistantId: string;
  calls: CallResult[];
  demo?: boolean;
}

export default function MakeCallPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CallResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/make-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    "call Manish and Aadidev and say we have job vacancy available for you now",
    "call Manish and tell him the meeting is scheduled for tomorrow",
    "call Aadidev and say the project deadline has been extended",
    "call Manish, Aadidev and inform them about the new policy update"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Phone className="h-8 w-8 text-blue-600" />
            AI Call Assistant
          </h1>
          <p className="text-lg text-gray-600">
            Natural language voice calling powered by VAPI AI
          </p>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Demo Mode - No actual calls will be made
          </Badge>
        </div>

        {/* Available Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available Contacts
            </CardTitle>
            <CardDescription>
              These contacts are available for calling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="outline">Manish (+1234567890)</Badge>
              <Badge variant="outline">Aadidev (+0987654321)</Badge>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h3 className="font-medium">Parse Query</h3>
                <p className="text-sm text-gray-600">AI parses your natural language request</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <h3 className="font-medium">Create Assistant</h3>
                <p className="text-sm text-gray-600">VAPI creates a voice assistant with your message</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <h3 className="font-medium">Make Calls</h3>
                <p className="text-sm text-gray-600">Assistant calls contacts and delivers message</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Make a Call</CardTitle>
            <CardDescription>
              Enter your request in natural language. For example: "call Manish and say we have a job opening"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="Enter your call request..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[100px]"
                disabled={loading}
              />
              <Button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Call...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Make Call
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Example Queries */}
        <Card>
          <CardHeader>
            <CardTitle>Example Queries</CardTitle>
            <CardDescription>
              Click on any example to try it out
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {exampleQueries.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full text-left justify-start h-auto p-3"
                  onClick={() => setQuery(example)}
                  disabled={loading}
                >
                  "{example}"
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Error:</span>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Display */}
        {result && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                Call Results
                {result.demo && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Demo Mode
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Parsed Query */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Parsed Request:</h4>
                <div className="bg-white p-3 rounded-lg border space-y-2">
                  <p><strong>Contacts:</strong> {result.parsedQuery.contacts.join(', ')}</p>
                  <p><strong>Message:</strong> "{result.parsedQuery.message}"</p>
                  <p><strong>Assistant ID:</strong> {result.assistantId}</p>
                </div>
              </div>

              {/* Call Results */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Call Status:</h4>
                <div className="space-y-2">
                  {result.calls.map((call, index) => (
                    <div key={index} className="bg-white p-3 rounded-lg border flex items-center justify-between">
                      <div>
                        <p className="font-medium">{call.contact}</p>
                        <p className="text-sm text-gray-600">{call.phoneNumber}</p>
                        {call.callId && (
                          <p className="text-xs text-gray-500">Call ID: {call.callId}</p>
                        )}
                        {call.error && (
                          <p className="text-sm text-red-600">{call.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {call.status === 'initiated' ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <Badge variant="default" className="bg-green-600">
                              {result.demo ? 'Demo Call Initiated' : 'Call Initiated'}
                            </Badge>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-red-600" />
                            <Badge variant="destructive">
                              Call Failed
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-sm text-green-700 font-medium">
                {result.message}
              </div>

              {result.demo && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Demo Mode:</strong> This is a demonstration. To make actual calls, configure your VAPI API key and phone number in the environment variables.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
