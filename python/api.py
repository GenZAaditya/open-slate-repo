import os
import json
import logging
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from typing import Dict, Any, List, Type, ClassVar

# Use the original working import.
from llama_extract import LlamaExtract

from pydantic import BaseModel, Field

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB limit

# -----------------------------------------------------------------------------
# Dynamic Schema Generator
# -----------------------------------------------------------------------------
class DynamicSchemaGenerator:
    @staticmethod
    def create_model(schema_config: Dict[str, Any]) -> Type[BaseModel]:
        """
        Dynamically creates a Pydantic model from the schema configuration.
        Expects schema_config to have a "properties" key with each field defined.
        """
        try:
            # Create an inner configuration class for extra fields handling.
            class Config:
                extra = "forbid"

            annotations = {}
            # Iterate through each field in the JSON schema
            for field_name, field_info in schema_config.get("properties", {}).items():
                if field_info.get("type") not in ["string", "number", "boolean", "array", "object"]:
                    raise ValueError(
                        f"Invalid type '{field_info.get('type')}' for field '{field_name}'"
                    )

                # Map JSON schema types to Python/Pydantic types
                type_mapping = {
                    "string": str,
                    "number": float,
                    "boolean": bool,
                    "array": List,
                    "object": Dict
                }

                # Define the field with default as required (using ellipsis)
                annotations[field_name] = (
                    type_mapping[field_info["type"]],
                    Field(
                        ...,
                        description=f"Extracted {field_name}",
                        title=field_name.capitalize()
                    )
                )

            # Build the namespace for the dynamic model
            # Start with the field annotations and add __module__.
            namespace = {
                "__annotations__": {k: v[0] for k, v in annotations.items()},
                "__module__": __name__,
                **{k: v[1] for k, v in annotations.items()},
            }
            # Annotate and add the Config class as a ClassVar so Pydantic won't treat it as a field.
            namespace["Config"] = Config
            namespace["__annotations__"]["Config"] = ClassVar[type(Config)]

            # Create the dynamic Pydantic model using type()
            DynamicModel = type("DynamicSchema", (BaseModel,), namespace)
            return DynamicModel

        except KeyError as e:
            logger.error(f"Missing key in schema config: {e}")
            raise
        except Exception as e:
            logger.error(f"Schema creation failed: {e}")
            raise

# -----------------------------------------------------------------------------
# Extraction Endpoint
# -----------------------------------------------------------------------------
@app.route("/extract", methods=["POST"])
def handle_extraction():
    """Main extraction endpoint"""
    try:
        # Validate uploaded file and config
        if "file" not in request.files:
            return jsonify({"success": False, "error": "No file uploaded"}), 400

        uploaded_file = request.files["file"]
        if uploaded_file.filename == "":
            return jsonify({"success": False, "error": "Empty filename"}), 400

        if "config" not in request.form:
            return jsonify({"success": False, "error": "Missing config"}), 400

        try:
            config = json.loads(request.form["config"])
        except json.JSONDecodeError:
            return jsonify({"success": False, "error": "Invalid JSON in config"}), 400

        if "data_schema" not in config:
            return jsonify({"success": False, "error": "Missing data_schema in config"}), 400

        # Create a temporary file using mkstemp (works better on Windows)
        fd, temp_file_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd)  # Close the file descriptor to avoid locking on Windows

        # Save the uploaded file's content to the temporary file path
        uploaded_file.save(temp_file_path)
        logger.info(f"Processing file: {uploaded_file.filename}")

        # Initialize the extractor with the API key from environment variables
        extractor = LlamaExtract(api_key=os.getenv("LLAMA_CLOUD_API_KEY"))

        # Generate a dynamic schema using the provided config
        DynamicModel = DynamicSchemaGenerator.create_model(config["data_schema"])

        # Configure the extraction agent
        agent = extractor.create_agent(
            name="dynamic_extractor",
            data_schema=DynamicModel,
            config={
                "extraction_mode": config.get("extraction_mode", "ACCURATE"),
                "system_prompt": config.get("system_prompt", "Extract relevant information from document"),
                "handle_missing": config.get("handle_missing", False),
            },
        )

        # Perform the extraction on the temporary file
        result = agent.extract(temp_file_path)

        # Remove the temporary file after processing
        os.remove(temp_file_path)

        return jsonify({"success": True, "data": result.data})

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error(f"Extraction failed: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": "Internal server error"}), 500

# -----------------------------------------------------------------------------
# Run Server
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(
        host=os.getenv("FLASK_HOST", "0.0.0.0"),
        port=int(os.getenv("FLASK_PORT", 5000)),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
