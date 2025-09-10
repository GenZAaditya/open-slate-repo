import React, { useState } from "react";
import { useUser } from '../../UserContext';
import FileUpload from "./Fileupload";

const Extraction = () => {
  const { userId } = useUser();
  
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [newField, setNewField] = useState({
    FieldName: "",
    Datatype: "string",
  });
  const [fields, setFields] = useState([]);
  const [extractionResult, setExtractionResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const EXTRACTION_API = "https://fn3yrpr3gl.execute-api.ap-south-1.amazonaws.com/Production/extraction";
  const STATUS_API_BASE = "https://fn3yrpr3gl.execute-api.ap-south-1.amazonaws.com/Production/status";

  const handleAddField = () => {
    if (newField.FieldName.trim()) {
      setFields([...fields, { name: newField.FieldName, type: newField.Datatype }]);
      setNewField({ FieldName: "", Datatype: "string" });
    }
  };

  const handleRemoveField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewField(prev => ({ ...prev, [name]: value }));
  };

  const generateSchema = () => {
    const properties = {};
    fields.forEach(field => {
      properties[field.name] = { type: field.type };
    });
    return {
      additionalProperties: false,
      properties,
      required: fields.map(f => f.name),
      type: "object"
    };
  };

  const makeApiCall = async (url, method, body = null) => {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId
      },
      mode: 'cors',
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  };

  const checkStatus = async (jobId) => {
    try {
      const data = await makeApiCall(`${STATUS_API_BASE}/${jobId}`, 'GET');
      console.log('Status response:', data);
      
      if (data.success && data.overall_status === 'SUCCESS' && data.data) {
        setExtractionResult(data.data);
        setIsLoading(false);
        setStatusMessage('Extraction completed!');
        return true;
      } else if (data.success && data.overall_status === 'FAILED') {
        setIsLoading(false);
        setStatusMessage('Extraction failed. Please try again.');
        return true;
      } else {
        setStatusMessage(`Status: ${data.overall_status || 'Processing'}`);
        return false;
      }
    } catch (error) {
      console.error('Status check failed:', error);
      setStatusMessage(`Status check failed: ${error.message}`);
      return false;
    }
  };

  const startPolling = (jobId) => {
    let attempts = 0;
    const maxAttempts = 4;
    
    const poll = async () => {
      attempts++;
      console.log(`Poll attempt ${attempts}/${maxAttempts}`);
      
      const shouldStop = await checkStatus(jobId);
      
      if (shouldStop || attempts >= maxAttempts) {
        if (attempts >= maxAttempts) {
          setIsLoading(false);
          setStatusMessage('Timeout: Please check status manually.');
        }
        return;
      }
      
      setTimeout(poll, 5000);
    };
    
    setTimeout(poll, 3000);
  };

  const handleExtraction = async () => {
    if (!uploadedFiles.length) {
      alert("Please upload a file first");
      return;
    }

    if (fields.length === 0) {
      alert("Please add at least one field to extract");
      return;
    }

    setIsLoading(true);
    setExtractionResult(null);
    setStatusMessage("Starting extraction...");
    setCurrentJobId(null);

    try {
      const file = uploadedFiles[0];
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Content = fileContent.split(',')[1];

      const payload = {
        filename: file.name,
        file_content: base64Content,
        user_id: userId,
        config: {
          extraction_mode: "ACCURATE",
          data_schema: generateSchema(),
          handle_missing: false
        }
      };

      const data = await makeApiCall(EXTRACTION_API, 'POST', payload);
      
      if (data.job_id) {
        setCurrentJobId(data.job_id);
        setStatusMessage(`Extraction started. Job ID: ${data.job_id}`);
        startPolling(data.job_id);
      } else {
        throw new Error('No job ID received');
      }
    } catch (error) {
      console.error('Extraction failed:', error);
      setStatusMessage(`Extraction failed: ${error.message}`);
      setIsLoading(false);
      alert(`Extraction failed: ${error.message}`);
    }
  };

  const handleStatusCheck = () => {
    if (currentJobId) {
      checkStatus(currentJobId);
    } else {
      alert("No active job to check");
    }
  };

  const handleReset = () => {
    setIsLoading(false);
    setExtractionResult(null);
    setStatusMessage("");
    setCurrentJobId(null);
  };

  return (
    <div className="flex-1 bg-background overflow-y-auto">
      <div className="border-b border-border bg-background-alt">
        <button className="px-4 py-2 bg-primary text-white border-b-2 border-primary rounded-t-md transition-colors duration-200">
          Schema
        </button>
      </div>

      <div className="flex h-full">
        <div className="w-1/2 p-6 bg-background-alt border-r border-border">
          <div className="h-full">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Agent Configuration</h2>

            <div className="space-y-3 mb-6">
              {fields.map((field, index) => (
                <div className="flex items-center gap-3 p-3 bg-background rounded-md border border-border" key={index}>
                  <div className="flex-1 font-medium text-text-primary">{field.name}</div>
                  <div className="text-sm text-text-secondary px-2 py-1 bg-background-alt rounded">{field.type}</div>
                  <button
                    className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 rounded transition-colors duration-200"
                    onClick={() => handleRemoveField(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-3 mb-4">
              <input
                type="text"
                name="FieldName"
                value={newField.FieldName}
                onChange={handleInputChange}
                placeholder="Enter Field Name"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <select
                name="Datatype"
                value={newField.Datatype}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="object">object</option>
                <option value="array">array</option>
              </select>
            </div>

            <button 
              className="w-full px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 mb-6"
              onClick={handleAddField}
            >
              + Add Field
            </button>

            {(isLoading || statusMessage) && (
              <div className="bg-background-alt border border-border rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-text-primary mb-3">Extraction Status:</h3>
                {currentJobId && <p className="text-sm text-text-secondary mb-2"><strong>Job ID:</strong> {currentJobId}</p>}
                {statusMessage && <p className="text-sm text-text-secondary mb-3"><strong>Message:</strong> {statusMessage}</p>}
                {isLoading && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-text-secondary">Processing...</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button 
                className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isLoading 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-primary hover:bg-primary-dark text-white focus:ring-primary'
                }`}
                onClick={handleExtraction}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Start Extraction'}
              </button>

              {currentJobId && (
                <div className="flex gap-2">
                  <button 
                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isLoading 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-accent hover:bg-orange-600 text-white focus:ring-accent'
                    }`}
                    onClick={handleStatusCheck}
                    disabled={isLoading}
                  >
                    Check Status
                  </button>
                  <button 
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    onClick={handleReset}
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {extractionResult && extractionResult.data && (
              <div className="mt-6 bg-background-alt border border-border rounded-lg p-4">
                <h3 className="font-semibold text-text-primary mb-4">Extraction Results:</h3>
                <div className="space-y-3">
                  {Object.entries(extractionResult.data).map(([question, answer]) => (
                    <div key={question} className="p-3 bg-background rounded-md border border-border">
                      <div className="font-medium text-text-primary mb-2">{question}</div>
                      <div className="text-text-secondary">{answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-1/2 p-6">
          <FileUpload
            onFilesSelected={setUploadedFiles}
            value={uploadedFiles}
          />
        </div>
      </div>
    </div>
  );
};

export default Extraction;
