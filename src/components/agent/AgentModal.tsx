"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Bot, Check, AlertCircle, Info, Sparkles, File, Plus } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import PdfUpload from "./PdfUpload"
import { PdfFile } from "./PdfUpload"
import { toast } from 'sonner'

export interface Agent {
  id?: string
  name: string
  description?: string
  documents?: Array<{
    id: string
    filename: string
    tag: string
  }>
}

interface AgentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (agent: Omit<Agent, "id">) => Promise<Agent | undefined>
  agent?: Agent | null
}

export default function AgentModal({
  isOpen,
  onClose,
  onSave,
  agent
}: AgentModalProps) {
  const [name, setName] = useState(agent?.name || "")
  const [description, setDescription] = useState(agent?.description || "")
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    description?: string
  }>({})
  const [documents, setDocuments] = useState<PdfFile[]>([])
  const [isModalExpanded, setIsModalExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens/closes or agent changes
  useEffect(() => {
    if (isOpen) {
      setName(agent?.name || "")
      setDescription(agent?.description || "")
      setErrors({})
      setIsModalExpanded(false)
      setDocuments([])
    }
  }, [isOpen, agent])

  // Handle PDF addition
  const handlePdfAdded = useCallback((pdf: PdfFile) => {
    setDocuments(prev => [...prev, pdf]);
    if (!isModalExpanded) {
      setIsModalExpanded(true);
    }
  }, [isModalExpanded]);

  // Handle PDF removal
  const handlePdfRemoved = useCallback(async (pdfId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== pdfId));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const newAgent = await onSave({ name, description });
      if (newAgent) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save agent");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40"
        >
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300, 
              duration: 0.4 
            }}
            className="relative w-full max-w-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] border border-teal-500/20 overflow-hidden"
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-teal-900/10 pointer-events-none" />
            
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-slate-800 to-slate-900/80 backdrop-blur-sm relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-2 rounded-lg shadow-lg shadow-teal-700/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white font-['Be_Vietnam_Pro']">
                    {agent ? "Edit Agent" : "Create New Agent"}
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 relative z-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-teal-200 font-['Be_Vietnam_Pro']">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-teal-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-transparent transition-all shadow-inner font-['Be_Vietnam_Pro']"
                    placeholder="Enter agent name"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-400">{errors.name}</p>
                  )}
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-teal-200 font-['Be_Vietnam_Pro']">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/60 backdrop-blur-sm border border-teal-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-transparent transition-all min-h-[120px] shadow-inner font-['Be_Vietnam_Pro']"
                    placeholder="Enter agent description"
                  />
                  {errors.description && (
                    <p className="text-sm text-red-400">{errors.description}</p>
                  )}
                </div>

                {/* PDF Upload Section */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-teal-200 font-['Be_Vietnam_Pro']">
                    Documents
                  </label>
                  <div className="p-5 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-teal-500/20 rounded-xl shadow-inner">
                    <PdfUpload
                      showComingSoon={true}
                      agentId={agent?.id || ""}
                      onPdfAdded={handlePdfAdded}
                      onPdfRemoved={handlePdfRemoved}
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400 font-['Be_Vietnam_Pro']">{error}</p>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-slate-800 text-gray-300 rounded-lg hover:text-white transition-colors border border-white/5 shadow-sm font-['Be_Vietnam_Pro']"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98, translateY: 1 }}
                    type="submit"
                    disabled={isSaving}
                    className="relative overflow-hidden px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg font-medium transition-all transform disabled:opacity-50 disabled:cursor-not-allowed font-['Be_Vietnam_Pro'] shadow-[0_8px_20px_-6px_rgba(20,184,166,0.5)] group"
                  >
                    {/* 3D effect with light gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    {/* Animated glow effect */}
                    <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                    
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isSaving ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Save Agent</span>
                        </>
                      )}
                    </span>
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 