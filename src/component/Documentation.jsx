/**
 * Documentation component displays the project documentation for the Zenathon OCR Deepseek React application.
 *
 * This open-source platform enables developers to build and extend OCR solutions using a serverless architecture.
 * The application leverages RAG (Retrieval-Augmented Generation) models for efficient and accurate text extraction from images.
 *
 * Key Points:
 * - Open-source: Contributions are welcome to improve and expand the platform.
 * - Serverless: No backend server is required; all processing is handled client-side or via serverless APIs.
 * - RAG Model: Utilizes Retrieval-Augmented Generation for robust OCR capabilities.
 *
 * @component
 * @example
 * return (
 *   <Documentation />
 * )
 *
 * @returns {JSX.Element} A styled documentation page containing sections for overview, features, getting started, usage, and contact.
 *
 * @section Overview
 * Describes the purpose of the application, which is to provide OCR functionality using Deepseek and RAG models in a serverless, open-source environment.
 *
 * @section Features
 * Lists the main features: image upload and preview, text extraction via OCR (RAG), and options to copy or download extracted text.
 *
 * @section Getting Started
 * Step-by-step instructions for cloning the repository, installing dependencies, and starting the development server.
 *
 * @section Usage
 * Explains how to use the application to upload images and extract text.
 *
 * @section Contact
 * Provides information for contacting the project maintainer for support or questions.
 */
import React from 'react';

const Documentation = () => (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
        <h1>Project Documentation</h1>
        <section>
            <h2>Overview</h2>
            <p>
                This project is a React application designed to provide OCR (Optical Character Recognition) functionality using Deepseek. It allows users to upload images and extract text efficiently.
            </p>
        </section>
        <section>
            <h2>Features</h2>
            <ul>
                <li>Image upload and preview</li>
                <li>Text extraction using OCR</li>
                <li>Copy and download extracted text</li>
            </ul>
        </section>
        <section>
            <h2>Getting Started</h2>
            <ol>
                <li>Clone the repository.</li>
                <li>Run <code>npm install</code> to install dependencies.</li>
                <li>Start the development server with <code>npm start</code>.</li>
            </ol>
        </section>
        <section>
            <h2>Usage</h2>
            <p>
                Upload an image and click the "Extract Text" button. The extracted text will appear below the image.
            </p>
        </section>
        <section>
            <h2>Contact</h2>
            <p>
                For questions or support, please contact the project maintainer.
            </p>
        </section>
    </div>
);

export default Documentation;