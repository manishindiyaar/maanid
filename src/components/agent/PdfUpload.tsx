"use client"

import React, { useState, useCallback } from 'react';
import { Upload, X, File, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

export interface PdfFile {
  id?: string;
  agent_id?: string;
  file?: File;
  tag: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  filename?: string;
}

interface PdfUploadProps {
  agentId?: string;
  onPdfAdded: (pdf: PdfFile) => void;
  onPdfRemoved: (id: string) => void;
  existingPdfs?: PdfFile[];
  showComingSoon?: boolean;
}

const PdfUpload: React.FC<PdfUploadProps> = ({ 
  agentId, 
  onPdfAdded, 
  onPdfRemoved,
  existingPdfs = [],
  showComingSoon = false
}) => {
  const [pdfs, setPdfs] = useState<PdfFile[]>(existingPdfs);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [currentTag, setCurrentTag] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];
    
    if (!file) return;
    
    // Check if file is a PDF
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      toast.error('Only PDF files are allowed');
      return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size should be less than 10MB');
      toast.error('File size should be less than 10MB');
      return;
    }
    
    setSelectedFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const handleAddPdf = async () => {
    if (!selectedFile || !currentTag) {
      toast.error('Please select a file and provide a tag');
      return;
    }

    // For new agents without IDs, generate a temporary ID and store for later upload
    if (!agentId) {
      const tempId = `temp-${Date.now()}`;
      const newPdf: PdfFile = {
        id: tempId,
        file: selectedFile,
        filename: selectedFile.name,
        tag: currentTag,
        status: 'processing'
      };
      
      setPdfs([...pdfs, newPdf]);
      onPdfAdded(newPdf);
      setSelectedFile(null);
      setCurrentTag('');
      setShowUploadForm(false);
      toast.success('PDF added and will be uploaded when the agent is created');
      return;
    }

    // For existing agents, upload immediately
    const newPdf: PdfFile = {
      id: `temp-upload-${Date.now()}`, // Add temporary ID for tracking
      file: selectedFile,
      filename: selectedFile.name,
      tag: currentTag,
      status: 'uploading'
    };

    setPdfs(prev => [...prev, newPdf]);
    setIsUploading(true);

    try {
      console.log('Starting file upload...');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('tag', currentTag);
      
      // Try legacy endpoint first since we know it works
      console.log('Sending request to /api/agents/documents with agent_id:', agentId);
      formData.append('agent_id', agentId || '');
      
      // Update UI status to show processing
      setPdfs(current => 
        current.map(p => 
          p.id === newPdf.id ? { ...p, status: 'processing' } : p
        )
      );
      
      // Show toast to inform user
      toast.loading('Processing PDF and generating embeddings. This may take a minute...');
      
      let response = await fetch('/api/agents/documents', {
        method: 'POST',
        body: formData
      });

      // Log response for debugging
      console.log('Response status:', response.status);
      if (!response.ok) {
        let errorText = await response.text();
        console.error('Upload failed:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: `HTTP error ${response.status}`, details: errorText };
        }
        throw new Error(errorData.error || 'Failed to upload document');
      }

      const result = await response.json();
      console.log('Upload result:', result);
      
      // Update state to mark document as completed
      setPdfs(current => 
        current.map(p => 
          p.id === newPdf.id ? {
            ...p,
            id: result.id,
            agent_id: result.agent_id || agentId,
            status: 'completed'
          } : p
        )
      );
      
      // Notify parent
      onPdfAdded({
        ...newPdf,
        id: result.id,
        agent_id: result.agent_id || agentId,
        status: 'completed'
      });
      
      toast.success('PDF uploaded and vectorized successfully');
    } catch (error: any) {
      console.error('Error uploading document:', error);
      
      const errorMessage = error?.message || 'Unknown error';
      
      // Update state to mark document as error
      setPdfs(current => 
        current.map(p => 
          p.id === newPdf.id ? { ...p, status: 'error', error: errorMessage } : p
        )
      );
      
      // Also notify parent about the error
      onPdfAdded({
        ...newPdf,
        status: 'error',
        error: errorMessage
      });
      
      toast.error(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      setCurrentTag('');
      setShowUploadForm(false);
    }
  };

  const handleRemovePdf = async (id?: string) => {
    if (!id) return;
    
    const pdfToRemove = pdfs.find(p => p.id === id);
    if (!pdfToRemove) return;
    
    // If it's a temporary ID (for new agents), just remove from state
    if (id.startsWith('temp-')) {
      setPdfs(current => current.filter(p => p.id !== id));
      onPdfRemoved(id);
      return;
    }
    
    // For uploaded documents, delete from server
    try {
      const response = await fetch(`/api/agents/documents?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error deleting document:', errorText);
        toast.error('Failed to delete document');
        return;
      }
      
      setPdfs(current => current.filter(p => p.id !== id));
      onPdfRemoved(id);
      toast.success('Document deleted successfully');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      console.error('Error deleting document:', errorMessage);
      toast.error(`Failed to delete document: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-white font-medium">
          Knowledge Base
          <span className="text-gray-400 text-sm font-normal">(PDFs)</span>
        </label>
        {showComingSoon && (
          <span className="px-2 py-0.5 bg-gray-700/50 text-gray-400 text-xs font-medium rounded-full">
            Coming Soon
          </span>
        )}
      </div>

      {/* Uploaded PDFs list */}
      <div className="space-y-2">
        <AnimatePresence>
          {pdfs.map((pdf) => (
            <motion.div
              key={pdf.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between bg-gray-800/30 border border-gray-700/50 rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gray-700/50 p-2 rounded-lg">
                  <File className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm font-medium truncate max-w-[150px]">
                    {pdf.file?.name || pdf.filename || 'Unnamed file'}
                  </p>
                  <p className="text-gray-500 text-xs">{pdf.tag}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pdf.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                )}
                {pdf.status === 'processing' && (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                )}
                {pdf.status === 'completed' && (
                  <CheckCircle2 className="w-4 h-4 text-gray-400" />
                )}
                {pdf.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                )}
                <button
                  onClick={() => handleRemovePdf(pdf.id)}
                  className="p-1 rounded-md text-gray-400 hover:bg-gray-700/50 transition-colors"
                  disabled={showComingSoon}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Upload section */}
      {!showUploadForm ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowUploadForm(true)}
          className="w-full border border-dashed border-gray-700/50 rounded-lg flex items-center justify-center p-4 text-gray-500 hover:text-gray-400 hover:border-gray-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={showComingSoon}
        >
          <div className="flex flex-col items-center">
            <Upload className="w-5 h-5 mb-1" />
            <span className="text-sm">Upload PDF</span>
          </div>
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border border-gray-700/50 rounded-lg p-4 bg-gray-800/30"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-medium">Add PDF</h3>
              <button
                onClick={() => {
                  setShowUploadForm(false);
                  setError(null);
                  setSelectedFile(null);
                  setCurrentTag('');
                }}
                className="p-1 rounded-full hover:bg-gray-700 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* File input section */}
            <div
              {...getRootProps()}
              className={`border border-dashed rounded-lg p-4 cursor-pointer flex flex-col items-center justify-center ${
                selectedFile
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'border-gray-700 text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              <input {...getInputProps()} />
              
              <Upload className="w-5 h-5 mb-2" />
              
              {selectedFile ? (
                <div className="text-center">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium">Select PDF file</p>
                  <p className="text-xs text-gray-500">Click to browse or drag and drop</p>
                </div>
              )}
            </div>
            
            {/* Tag input */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Tag (for reference in prompts)
              </label>
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                placeholder="e.g., 'pricing', 'product-specs'"
                className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use this tag to reference content in agent prompts with {'{tag}'}
              </p>
            </div>
            
            {error && (
              <div className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            {/* Submit button */}
            <div className="flex justify-end">
              <button
                onClick={handleAddPdf}
                disabled={!selectedFile || !currentTag || isUploading}
                className={`px-4 py-2 rounded-md text-white font-medium 
                  ${!selectedFile || !currentTag || isUploading
                    ? 'bg-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                  } transition-colors`}
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  'Add PDF'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PdfUpload; 