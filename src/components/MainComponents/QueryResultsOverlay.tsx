'use client'

import { motion } from "framer-motion";
import QueryResults from "./../chat/QueryResults";
import { QueryResult } from "./types";

interface QueryResultsOverlayProps {
  queryResults: QueryResult | null;
  onClose: () => void;
  lastQuery: string;
  onSelectContact: (contactId: string) => void;
}

const QueryResultsOverlay = ({
  queryResults,
  onClose,
  lastQuery,
  onSelectContact
}: QueryResultsOverlayProps) => {
  if (!queryResults) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-md"></div>
      
      {/* Centered query results */}
      <div className="relative w-full max-w-2xl">
        <QueryResults 
          queryResult={queryResults} 
          onClose={onClose} 
          queryText={lastQuery || ''}
          onSelectContact={onSelectContact}
        />
      </div>
    </motion.div>
  );
};

export default QueryResultsOverlay; 