#!/bin/bash

#Add the new text key and the English translation to translations.json. Execute FrontEnd/src/run_translator.sh. Do not run raw pip install commands. 
#Rely strictly on the wrapper script to maintain system isolation.

# Navigate to the script's directory
cd "$(dirname "$0")"

# Name of the virtual environment directory
VENV_DIR="../../venv"

# Create the virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate the virtual environment
source "$VENV_DIR/bin/activate"

# Install required dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install deep-translator

# Run the translator script
echo "Running translator.py..."
python3 translator.py

# Deactivate the virtual environment
deactivate
