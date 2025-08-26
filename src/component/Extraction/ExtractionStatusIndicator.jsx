import React from 'react';
import { useUser } from '../../UserContext';

const ExtractionStatusIndicator = () => {
  const { currentExtraction } = useUser();
  const { isLoading, statusMessage, jobId } = currentExtraction;

  if (!isLoading && !jobId) {
    return null; // Don't show anything if no active extraction
  }

  return (
    <div className="extraction-status-indicator">
      <div className="extraction-status-indicator__content">
        {isLoading && (
          <div className="extraction-status-indicator__spinner">
            <div className="spinner"></div>
          </div>
        )}
        <div className="extraction-status-indicator__text">
          <div className="extraction-status-indicator__title">
            {isLoading ? 'Extraction in Progress' : 'Extraction Complete'}
          </div>
          {statusMessage && (
            <div className="extraction-status-indicator__message">
              {statusMessage}
            </div>
          )}
          {jobId && (
            <div className="extraction-status-indicator__job-id">
              Job: {jobId.substring(0, 8)}...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExtractionStatusIndicator;