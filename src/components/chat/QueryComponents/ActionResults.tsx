import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send } from 'lucide-react';
import { Button } from './../../../components/ui/button';
import { motion } from 'framer-motion';

/**
 * Interface for memory/contact objects used in ActionResults
 */
interface Memory {
  id: string;
  content: string;
  name?: string;
  contact_info?: string;
  user_id?: string;
}

/**
 * Props for the ActionResults component
 */
interface ActionResultsProps {
  memories: Memory[];
  actionMessage?: string;
  onSelectContact?: (id: string) => void;
  onClose?: () => void;
}

/**
 * ActionResults Component
 * 
 * Handles displaying and sending messages to contacts
 * Shows message compose area and list of recipients
 * Manages message sending state and animations
 */
export function ActionResults({ memories, actionMessage, onSelectContact, onClose }: ActionResultsProps) {
  const [editedMessage, setEditedMessage] = useState(actionMessage || '');
  const [sendingStatus, setSendingStatus] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false); // Prevent double sends
  
  // Clean up any popups or duplicate UI that might remain
  useEffect(() => {
    // Close any existing confirmation popups
    const closePopups = () => {
      // Find and remove any ActionPrompt or confirmation modals
      const popups = document.querySelectorAll('[role="dialog"]');
      popups.forEach(popup => {
        if (popup.textContent?.includes('Confirm Action')) {
          popup.remove();
        }
      });
    };
    
    closePopups();
    // Run on unmount too
    return () => closePopups();
  }, []);

  // Generate a unique ID for batching
  const generateBatchId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `action-${timestamp}-${random}`;
  };

  // Handle sending messages to contacts
  const handleSendMessage = async () => {
    // Prevent double submission
    if (isSending) return;
    
    // Validate message
    if (!editedMessage.trim()) {
      setError("Message cannot be empty");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    try {
      setIsSending(true); // Lock sending state
      
      // Create initial sending status for all recipients
      const initialStatus: {[key: string]: boolean} = {};
      memories.forEach(memory => {
        initialStatus[memory.id] = false;
      });
      setSendingStatus(initialStatus);
      
      // Prepare recipients array for the API call
      const apiRecipients = memories.map(memory => ({
        id: memory.id,
        name: memory.name,
        contact_info: memory.contact_info
      }));
      
      // Generate a unique batch ID for this send operation
      const batchId = generateBatchId();
      
      console.log(`Sending message to ${apiRecipients.length} recipients in batch ${batchId}`);
      
      // Make one single API call with all recipients
      const actionResponse = await fetch('/api/execute-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_message',
          message: editedMessage.trim(),
          recipients: apiRecipients,
          skipConfirmation: true,
          batchId: batchId // Include a batch ID to help with deduplication
        }),
      });

      if (!actionResponse.ok) {
        throw new Error('Failed to execute action');
      }

      // Parse the response
      const actionData = await actionResponse.json();
      console.log(`Batch send response:`, actionData);
      
      // Update UI based on the response
      if (actionData && actionData.results) {
        actionData.results.forEach((result: any) => {
          const recipient = memories.find(m => m.name === result.recipient);
          if (recipient) {
            setSendingStatus(prev => ({
              ...prev,
              [recipient.id]: result.status === 'sent' || result.status.includes('duplicate')
            }));
          }
        });
      } else {
        // Default handling if no specific results
        memories.forEach(memory => {
          setSendingStatus(prev => ({
            ...prev,
            [memory.id]: true
          }));
        });
      }
      
      // Show success animation
      setShowSuccess(true);
      
      // Close the dialog after showing success animation
      setTimeout(() => {
        onClose?.();
      }, 1000);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSending(false); // Unlock sending state
    }
  };

  // Show success animation when messages are sent
  if (showSuccess) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center py-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1],
            opacity: [0, 1, 1]
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6"
        >
          <svg 
            className="w-16 h-16 text-green-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
          </svg>
        </motion.div>
        <motion.p 
          className="text-xl font-medium text-teal-300"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Message Sent Successfully
        </motion.p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Editable message section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-teal-300 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Message to send:
        </h4>
        <div className="relative p-4 rounded-lg bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/30">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-cyan-500/5 to-teal-500/5 rounded-lg blur" />
          <textarea
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            className="w-full p-3 rounded bg-slate-900/50 border border-teal-500/20 text-teal-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 relative resize-y min-h-[80px]"
            placeholder="Edit your message here..."
          />
        </div>
      </div>

      {/* Recipients section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-teal-300 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Recipients ({memories.length})
        </h4>
        
        <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
          {memories.map((memory, index) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-4 rounded-lg transition-all duration-300"
            >
              {/* Background effects */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-teal-500/10 to-cyan-500/10 opacity-75" />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative flex items-center">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center text-xl font-semibold mr-4">
                  {memory.name?.[0]?.toUpperCase() || '?'}
                </div>
                
                <div className="flex-1">
                  <p className="text-teal-100 font-medium text-lg">{memory.name}</p>
                  {memory.contact_info && (
                    <p className="text-sm text-teal-300/70">{memory.contact_info}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-0 left-0 right-0 z-50 bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <X className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-200 hover:text-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
      
      {/* Action buttons at the bottom */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-teal-500/20">
        <Button
          size="sm"
          variant="outline"
          className="relative border-teal-500/30 text-teal-300 hover:bg-teal-500/10 hover:text-teal-200"
          onClick={onClose}
        >
          <X className="h-4 w-4 mr-2" />
          <span>Cancel</span>
        </Button>
        <Button
          size="sm"
          className="relative group/button bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white transition-all duration-300"
          onClick={handleSendMessage}
        >
          <div className="absolute inset-0 rounded-md bg-gradient-to-r from-teal-400/0 via-white/25 to-teal-400/0 opacity-0 group-hover/button:opacity-100 blur transition-opacity duration-300" />
          <Send className="h-4 w-4 mr-2" />
          <span className="relative">Send Message</span>
        </Button>
      </div>
    </div>
  );
} 