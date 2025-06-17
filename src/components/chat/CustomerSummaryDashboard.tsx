'use client'

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, Tag, MapPin, Briefcase, User, MessageSquare, Heart } from 'lucide-react';

interface Memory {
  id: string;
  content: string;
  memory_data: any;
  created_at: string;
  user_id: string;
}

interface Contact {
  id: string;
  name: string;
  contact_info: string;
}

interface CustomerSummaryDashboardProps {
  contact: Contact;
  memories: Memory[];
  onClose?: () => void;
}

export default function CustomerSummaryDashboard({
  contact,
  memories,
  onClose,
}: CustomerSummaryDashboardProps) {
  const [summary, setSummary] = useState<string>('');
  const [hasProcessed, setHasProcessed] = useState(false);
  const [sortedMemories, setSortedMemories] = useState<Memory[]>([]);
  const [keyInfo, setKeyInfo] = useState<{
    location: string;
    occupation: string;
    interests: string[];
    firstContact: string;
  }>({
    location: '',
    occupation: '',
    interests: [],
    firstContact: '',
  });

  useEffect(() => {
    if (!hasProcessed && memories.length > 0) {
      processMemories();
      setHasProcessed(true);
    }
  }, [memories, hasProcessed]);

  const processMemories = async () => {
    // Sort memories chronologically from oldest to newest
    const sorted = [...memories].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    setSortedMemories(sorted);

    // Extract key information from memories
    let location = '';
    let jobInterest = '';
    let employmentStatus = '';
    let salary = '';
    let interests: string[] = [];

    sorted.forEach(memory => {
      const content = memory.content.toLowerCase();
      
      // Extract location
      if (content.includes('from') || content.includes('location')) {
        const locationMatch = memory.content.match(/from\s+([^,.]+)/i) || 
                             memory.content.match(/location[:\s]+([^,.]+)/i);
        if (locationMatch) location = locationMatch[1].trim();
      }

      // Extract location from memory_data if available
      if (memory.memory_data?.location) {
        location = memory.memory_data.location;
      }
      
      // Extract job interest
      if (content.includes('chef') || content.includes('job')) {
        if (content.includes('chef')) jobInterest = 'chef';
        if (memory.memory_data?.job_interest) {
          jobInterest = memory.memory_data.job_interest;
        }
      }

      // Extract employment status
      if (content.includes('jobless') || content.includes('seeking employment')) {
        employmentStatus = 'currently seeking employment';
      }

      // Extract salary expectations
      if (content.includes('salary') || content.includes('expected')) {
        const salaryMatch = content.match(/salary[:\s]+([^,.]+)/i) ||
                           content.match(/expected[:\s]+([^,.]+)/i);
        if (salaryMatch) salary = salaryMatch[1].trim();
      }

      // Extract interests
      if (content.includes('interest') || content.includes('hobby') || content.includes('likes')) {
        const interestMatch = memory.content.match(/(?:interest|hobby|likes)[:\s]+([^.]+)/i);
        if (interestMatch) {
          const extractedInterests = interestMatch[1].split(',').map(i => i.trim());
          interests = [...interests, ...extractedInterests];
        }
      }
    });

    // Save key info for UI display
    setKeyInfo({
      location,
      occupation: jobInterest || (employmentStatus ? 'Job seeker' : ''),
      interests: Array.from(new Set(interests)),
      firstContact: sorted.length > 0 ? new Date(sorted[0].created_at).toLocaleDateString() : '',
    });

    // Construct the natural language summary
    const summaryParts = [];
    
    // Basic information
    if (location) {
      summaryParts.push(`${contact.name} is from ${location}`);
    } else {
      summaryParts.push(`${contact.name}`);
    }
    
    // Employment information
    if (jobInterest || employmentStatus) {
      const jobInfo = [];
      if (employmentStatus) jobInfo.push(employmentStatus);
      if (jobInterest) jobInfo.push(`looking for opportunities as a ${jobInterest}`);
      if (salary) jobInfo.push(`with an expected salary of ${salary}`);
      summaryParts.push(jobInfo.join(' '));
    }

    // Add interests if available
    if (interests.length > 0) {
      // Convert to array first to avoid TypeScript iteration error
      const uniqueInterests = Array.from(new Set(interests));
      if (uniqueInterests.length === 1) {
        summaryParts.push(`is interested in ${uniqueInterests[0]}`);
      } else if (uniqueInterests.length > 1) {
        const lastInterest = uniqueInterests.pop();
        summaryParts.push(`is interested in ${uniqueInterests.join(', ')} and ${lastInterest}`);
      }
    }

    // Join all parts and clean up
    let finalSummary = summaryParts.filter(Boolean).join(' and ');
    finalSummary = finalSummary.replace(/\s+/g, ' ').trim();
    finalSummary = finalSummary.replace(/,\s*$/, '');
    finalSummary += '.';

    // Use first contact if available
    if (sorted.length > 0) {
      const firstContact = new Date(sorted[0].created_at).toLocaleDateString();
      finalSummary += ` First contacted on ${firstContact}.`;
    }

    setSummary(finalSummary);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ 
          type: "spring",
          stiffness: 300,
          damping: 25,
          duration: 0.5
        }}
        className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 rounded-xl border border-slate-700/70 shadow-2xl max-w-2xl w-full p-6 text-white overflow-hidden"
      >
        {/* Header with enhanced animation */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.2
              }}
              className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500/40 to-purple-500/40 flex items-center justify-center text-2xl font-bold border border-blue-500/30 shadow-lg shadow-blue-500/10"
            >
              {contact.name.charAt(0)}
            </motion.div>
            <div>
              <motion.h3 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200"
              >
                {contact.name}
              </motion.h3>
              <motion.p 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="text-white/60"
              >
                {contact.contact_info}
              </motion.p>
            </div>
          </div>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onClose?.()}
            className="text-white/70 hover:text-white transition-colors p-2 rounded-full bg-white/5 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Customer Info Cards with staggered animation */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5"
        >
          {keyInfo.location && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 rounded-lg p-3 border border-blue-700/30"
            >
              <div className="flex items-center gap-2 mb-2 text-blue-300">
                <MapPin className="h-4 w-4" />
                <h5 className="font-medium text-sm">Location</h5>
              </div>
              <p className="text-white/90">{keyInfo.location}</p>
            </motion.div>
          )}
          
          {keyInfo.occupation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 rounded-lg p-3 border border-purple-700/30"
            >
              <div className="flex items-center gap-2 mb-2 text-purple-300">
                <Briefcase className="h-4 w-4" />
                <h5 className="font-medium text-sm">Occupation</h5>
              </div>
              <p className="text-white/90">{keyInfo.occupation}</p>
            </motion.div>
          )}
          
          {keyInfo.firstContact && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/20 rounded-lg p-3 border border-emerald-700/30"
            >
              <div className="flex items-center gap-2 mb-2 text-emerald-300">
                <Calendar className="h-4 w-4" />
                <h5 className="font-medium text-sm">First Contact</h5>
              </div>
              <p className="text-white/90">{keyInfo.firstContact}</p>
            </motion.div>
          )}
        </motion.div>

        {/* Summary Section with enhanced animation */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, type: "spring", stiffness: 300, damping: 20 }}
          className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 rounded-lg p-4 mb-5 border border-slate-700/50"
        >
          <h4 className="text-lg font-medium mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-blue-400" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
              Customer Summary
            </span>
          </h4>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="text-white/80 leading-relaxed"
          >
            {summary || "Generating summary..."}
          </motion.p>
        </motion.div>

        {/* Interests Section with staggered item animation */}
        {keyInfo.interests.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, type: "spring", stiffness: 300, damping: 20 }}
            className="bg-gradient-to-br from-pink-900/20 to-pink-800/20 rounded-lg p-4 mb-5 border border-pink-700/30"
          >
            <h4 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-400" />
              <span className="text-pink-200">Interests</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {keyInfo.interests.map((interest, index) => (
                <motion.span 
                  key={interest} 
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 1.2 + (index * 0.1) }}
                  className="px-3 py-1.5 bg-pink-500/10 rounded-full text-sm text-pink-100 border border-pink-500/20"
                >
                  {interest}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Interactions with enhanced animation */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, type: "spring", stiffness: 300, damping: 20 }}
          className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 rounded-lg p-4 border border-slate-700/50"
        >
          <h4 className="text-lg font-medium mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
              Recent Interactions
            </span>
          </h4>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {sortedMemories.slice().reverse().slice(0, 5).map((memory, index) => (
              <motion.div 
                key={memory.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4 + (index * 0.1) }}
                className="p-3 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <p className="text-white/90">{memory.content}</p>
                <div className="flex gap-3 mt-2 text-xs text-white/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(memory.created_at).toLocaleDateString()}
                  </span>
                  {memory.memory_data?.type && (
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {memory.memory_data.type}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          {sortedMemories.length === 0 && (
            <p className="text-center text-white/60 py-4">No interactions found</p>
          )}
        </motion.div>
      </motion.div>

      {/* Add custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 100px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 100px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
} 