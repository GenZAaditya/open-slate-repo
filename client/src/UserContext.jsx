import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const STATUS_API_BASE = "https://fn3yrpr3gl.execute-api.ap-south-1.amazonaws.com/Production/status";
  const HISTORY_API_BASE = "https://2uz1vqjee9.execute-api.ap-south-1.amazonaws.com/Prod/history";

  const [userId, setUserId] = useState(() => {
    let storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      storedUserId = generateUUID();
      localStorage.setItem('userId', storedUserId);
      console.log('Generated new userId:', storedUserId);
    } else {
      console.log('Retrieved existing userId:', storedUserId);
    }
    return storedUserId;
  });

  // Document history state management
  const [documentHistory, setDocumentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyLastFetched, setHistoryLastFetched] = useState(null);

  // Extraction state management in context
  const [extractionJobs, setExtractionJobs] = useState(new Map());
  const [activeJobId, setActiveJobId] = useState(null);

  // Current extraction state (NEW)
  const [currentExtraction, setCurrentExtraction] = useState({
    isLoading: false,
    jobId: null,
    statusMessage: "",
    result: null
  });

  // Update current extraction state (NEW)
  const updateCurrentExtraction = useCallback((updates) => {
    setCurrentExtraction(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear current extraction (NEW)
  const clearCurrentExtraction = useCallback(() => {
    setCurrentExtraction({
      isLoading: false,
      jobId: null,
      statusMessage: "",
      result: null
    });
  }, []);

  // Fetch document history from API
  const fetchDocumentHistory = useCallback(async (forceRefresh = false) => {
    // Don't fetch if already loading or if recently fetched (unless force refresh)
    const now = Date.now();
    const cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    
    if (!forceRefresh && historyLastFetched && (now - historyLastFetched) < cacheTimeout) {
      console.log('Using cached document history');
      return documentHistory;
    }

    if (historyLoading) {
      console.log('History fetch already in progress');
      return documentHistory;
    }

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await fetch(`${HISTORY_API_BASE}?user_id=${userId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const documents = data.data || [];
      
      setDocumentHistory(documents);
      setHistoryLastFetched(now);
      setHistoryError(null);
      
      console.log('Fetched document history:', data);
      console.log('Document count:', documents.length);
      
      // Log document details
      documents.forEach((doc, index) => {
        console.log(`Document ${index + 1}:`, doc.fileName);
        console.log('Extracted data:', doc.data?.data);
      });

      return documents;
    } catch (error) {
      console.error('Error fetching document history:', error);
      setHistoryError(error.message);
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, [userId, historyLoading, historyLastFetched, documentHistory]);

  // Get document by ID from cached history
  const getDocumentById = useCallback((docId) => {
    return documentHistory.find(doc => doc.id === docId) || null;
  }, [documentHistory]);

  // Get documents by status
  const getDocumentsByStatus = useCallback((status) => {
    return documentHistory.filter(doc => doc.status === status);
  }, [documentHistory]);

  // Add new document to history (useful when a new extraction completes)
  const addDocumentToHistory = useCallback((newDocument) => {
    setDocumentHistory(prev => {
      // Check if document already exists
      const existingIndex = prev.findIndex(doc => doc.id === newDocument.id);
      if (existingIndex >= 0) {
        // Update existing document
        const updated = [...prev];
        updated[existingIndex] = newDocument;
        return updated;
      } else {
        // Add new document to the beginning
        return [newDocument, ...prev];
      }
    });
  }, []);

  // Remove document from history
  const removeDocumentFromHistory = useCallback((docId) => {
    setDocumentHistory(prev => prev.filter(doc => doc.id !== docId));
  }, []);

  // Update document in history
  const updateDocumentInHistory = useCallback((docId, updates) => {
    setDocumentHistory(prev => {
      const index = prev.findIndex(doc => doc.id === docId);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...updates };
        return updated;
      }
      return prev;
    });
  }, []);

  // Clear history cache (force refresh on next fetch)
  const clearHistoryCache = useCallback(() => {
    setHistoryLastFetched(null);
  }, []);

  // Auto-fetch history when userId changes
  useEffect(() => {
    if (userId) {
      fetchDocumentHistory();
    }
  }, [userId, fetchDocumentHistory]);

  // Store extraction job data
  const storeExtractionJob = useCallback((jobId, jobData) => {
    setExtractionJobs(prev => {
      const newJobs = new Map(prev);
      newJobs.set(jobId, {
        ...jobData,
        lastUpdated: Date.now()
      });
      return newJobs;
    });
  }, []);

  // Get extraction job data from context (avoiding GET request)
  const getExtractionJob = useCallback((jobId) => {
    return extractionJobs.get(jobId) || null;
  }, [extractionJobs]);

  // Update job status in context
  const updateJobStatus = useCallback((jobId, status, result = null, message = '') => {
    setExtractionJobs(prev => {
      const newJobs = new Map(prev);
      const existingJob = newJobs.get(jobId);
      if (existingJob) {
        newJobs.set(jobId, {
          ...existingJob,
          status,
          result,
          message,
          lastUpdated: Date.now()
        });
      }
      return newJobs;
    });

    // If job completed successfully, refresh document history
    if (status === 'SUCCESS') {
      // Small delay to ensure backend has processed the document
      setTimeout(() => {
        fetchDocumentHistory(true);
      }, 1000);
    }
  }, [fetchDocumentHistory]);

  // Remove old jobs (cleanup)
  const cleanupOldJobs = useCallback(() => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    setExtractionJobs(prev => {
      const newJobs = new Map();
      for (const [jobId, jobData] of prev.entries()) {
        if (now - jobData.lastUpdated < maxAge) {
          newJobs.set(jobId, jobData);
        }
      }
      return newJobs;
    });
  }, []);

  // Get all jobs for current user
  const getUserJobs = useCallback(() => {
    return Array.from(extractionJobs.values()).filter(job => job.userId === userId);
  }, [extractionJobs, userId]);

  // Simulate status check without actual API calls for completed jobs
  const simulateStatusCheck = useCallback((jobId) => {
    const job = getExtractionJob(jobId);
    if (!job) return null;
    
    // If job is already completed, return cached result
    if (job.status === 'SUCCESS' || job.status === 'FAILED') {
      return {
        success: true,
        status: job.status,
        data: job.result,
        message: job.message
      };
    }
    
    // For pending/processing jobs, you might still want to check actual status
    // or implement a mock progression
    return null;
  }, [getExtractionJob]);

  const contextValue = {
    userId,
    setUserId,
    
    // Document History Management
    documentHistory,
    historyLoading,
    historyError,
    historyLastFetched,
    fetchDocumentHistory,
    getDocumentById,
    getDocumentsByStatus,
    addDocumentToHistory,
    removeDocumentFromHistory,
    updateDocumentInHistory,
    clearHistoryCache,
    
    // Extraction Management
    extractionJobs,
    activeJobId,
    setActiveJobId,
    storeExtractionJob,
    getExtractionJob, 
    updateJobStatus,
    cleanupOldJobs,
    getUserJobs,
    simulateStatusCheck,
    
    // Current Extraction State (NEW)
    currentExtraction,
    updateCurrentExtraction,
    clearCurrentExtraction,
    
    // API Endpoints
    STATUS_API_BASE,
    HISTORY_API_BASE
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// Dummy UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};