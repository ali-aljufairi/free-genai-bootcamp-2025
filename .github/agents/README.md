# GitHub Copilot Agents

This directory contains custom GitHub Copilot agent configurations that provide specialized AI assistance for specific tasks in the Sorami project.

## Available Agents

### deslop
**Purpose**: Remove AI-generated code "slop" from the codebase

The `deslop` agent reviews code changes and removes AI-generated patterns that don't align with the project's coding style:
- Unnecessary comments
- Excessive defensive programming
- Type casting workarounds (e.g., `any` casts)
- Debugging code (console.log, etc.)
- Inconsistent React patterns (unnecessary useEffect)
- Overly large files that should be split

**Tools**: file_editor, file_search, code_search, git, bash

**Usage**: Invoke this agent when you want to clean up AI-generated code before merging.

### commit
**Purpose**: Create well-formatted commit messages

The `commit` agent reviews staged changes and creates properly formatted commit messages following the project's conventions:
- Short, descriptive title (< 80 chars)
- 2-3 bullet points explaining the changes
- Only commits when explicitly instructed

**Tools**: git, file_search, bash

**Usage**: Invoke this agent when you're ready to commit your work and want a well-structured commit message.

## Configuration Format

Each agent is defined in a YAML file with the following structure:

```yaml
name: agent-name
description: Brief description of what the agent does
instructions: |
  Detailed instructions for the agent's behavior and task guidelines
  
tools:
  - tool1
  - tool2
```

### Available Tools

The following tools can be specified in agent configurations:
- `file_editor` - Read and edit files
- `file_search` - Search for files by name or pattern
- `code_search` - Search code content (grep/ripgrep)
- `git` - Git operations (diff, status, log, etc.)
- `bash` - Execute shell commands
- `web_search` - Search the web for information
- `github` - GitHub API operations

If no tools are specified, the agent has access to all enabled tools.

## Creating New Agents

To create a new agent:

1. Create a new `.yml` file in this directory
2. Define the agent's name, description, and instructions
3. Specify the minimal set of tools needed for the agent's task
4. Test the agent configuration
5. Document the agent in this README

## Best Practices

- **Minimal Tools**: Only specify tools that are necessary for the agent's task
- **Clear Instructions**: Provide specific, actionable instructions
- **Consistent Format**: Follow the existing agent structure
- **Tool Restrictions**: Restricting tools improves agent focus and reduces errors
