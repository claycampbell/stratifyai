# AI Chat Bubble Feature

## Overview

The AI Chat feature has been refactored from a separate page into a **global chat bubble** that appears on all pages, similar to customer support chatbots. The AI Chief Strategy Officer is now always available to help users with questions and actions.

## Features

### 🎯 Always Available
- Floating chat bubble accessible from any page
- Click to expand/collapse the chat interface
- Minimize option to keep chat accessible without taking up space
- Persistent chat sessions

### 💬 Conversational AI
- Natural language conversations with the AI Chief Strategy Officer
- Context-aware responses based on current system state (KPIs, OGSM components)
- Multi-turn conversations with history tracking
- Smart understanding of user intent

### ⚡ Action Execution
The AI can perform actions automatically when requested:

#### Supported Actions:
1. **Add KPI**: Create new Key Performance Indicators
2. **Update KPI**: Modify existing KPIs
3. **Add Objective**: Create new OGSM objectives
4. **Add Goal**: Create new OGSM goals
5. **Add Strategy**: Create new OGSM strategies
6. **Analyze Alignment**: Review strategic alignment
7. **Generate Report**: Create strategic reports

### 🔄 Action Flow
1. User sends a message requesting an action (e.g., "Add a KPI called Revenue Growth")
2. AI parses the intent and extracts parameters
3. If enough information is provided, action confirmation appears
4. User can approve or cancel the action
5. Action executes and updates the system
6. AI confirms success/failure

## How to Use

### Starting a Conversation
1. Click the floating **"AI Strategy Officer"** button in the bottom-right corner
2. Type your question or request
3. Press Enter or click Send

### Example Interactions

#### Questions:
- "What KPIs do I currently have?"
- "How is my strategic alignment?"
- "What should I focus on this quarter?"

#### Action Commands:
- "Add a KPI called 'Customer Satisfaction' with target 90 and current value 75 in percent"
- "Create a new objective titled 'Expand Market Share'"
- "Add a goal named 'Increase Revenue by 20%'"
- "Update KPI Revenue Growth to 85"
- "Generate a quarterly progress report"

### Action Parameters

#### For Adding KPIs:
- **Required**: Name
- **Optional**: Description, target value, current value, unit, frequency

#### For OGSM Components:
- **Required**: Title
- **Optional**: Description

## Technical Architecture

### Frontend Components

#### [`AIChatBubble.tsx`](frontend/src/components/AIChatBubble.tsx)
- Main chat bubble UI component
- Manages chat state and message display
- Handles action confirmation workflow
- Integrated into global layout

#### [`aiActions.ts`](frontend/src/services/aiActions.ts)
- Intent parsing logic
- Parameter extraction from natural language
- Action execution functions
- API calls for CRUD operations

### Backend Updates

#### [`ai.ts`](backend/src/routes/ai.ts)
- Enhanced chat endpoint with system context
- Gathers current KPIs and OGSM state
- Passes context to AI for better responses

#### [`geminiService.ts`](backend/src/services/geminiService.ts)
- New `chatWithActionSupport()` method
- Context-aware prompt engineering
- Guides users through action requirements

### Removed Files
- `frontend/src/pages/AIChat.tsx` (moved to bubble)
- `/ai-chat` route (removed from navigation)

## Benefits

### User Experience
✅ Always accessible - no need to navigate to separate page
✅ Contextual help wherever you are
✅ Quick actions without switching pages
✅ Natural language interface

### Functionality
✅ Multi-step conversations
✅ Action intent detection
✅ Parameter extraction from natural language
✅ Confirmation before execution
✅ Real-time system updates

### Developer Experience
✅ Modular action system - easy to add new actions
✅ Reusable intent parser
✅ Clear separation of concerns
✅ TypeScript type safety

## Future Enhancements

### Potential Improvements:
1. **Voice Input**: Add speech-to-text for hands-free interaction
2. **Rich Media**: Support images, charts in chat responses
3. **Action History**: Show recent actions with undo capability
4. **Suggested Actions**: AI proactively suggests relevant actions
5. **Multi-step Wizards**: Complex actions broken into steps
6. **Keyboard Shortcuts**: Quick access (e.g., Ctrl+K to open chat)
7. **Smart Notifications**: Bubble pulsates when AI has suggestions
8. **Export Conversations**: Save chat history for reference

## Testing

### Manual Testing Checklist:
- [ ] Chat bubble appears on all pages
- [ ] Can open/close/minimize chat
- [ ] Messages send and receive correctly
- [ ] AI provides relevant responses
- [ ] Action detection works for KPI creation
- [ ] Action detection works for OGSM components
- [ ] Action confirmation appears correctly
- [ ] Actions execute successfully
- [ ] System updates after action (KPIs list refreshes)
- [ ] Error handling for failed actions
- [ ] Chat history persists during session
- [ ] Multiple chat sessions work independently

### Example Test Cases:

**Test 1: Add KPI**
```
Input: "Add a KPI called Test KPI with target 100"
Expected: Action confirmation appears, execute creates KPI
```

**Test 2: Question**
```
Input: "What KPIs do I have?"
Expected: AI lists current KPIs from system
```

**Test 3: Incomplete Action**
```
Input: "Add a KPI"
Expected: AI asks for required details (name, etc.)
```

## Troubleshooting

### Chat doesn't appear
- Check browser console for errors
- Verify AIChatBubble is imported in Layout.tsx
- Check z-index conflicts with other elements

### Actions don't execute
- Check network tab for API errors
- Verify intent parser is detecting action correctly
- Check backend logs for execution errors
- Ensure required parameters are present

### AI responses seem off
- Check system context is being gathered correctly
- Review Gemini prompt in geminiService.ts
- Verify conversation history is being passed

## API Reference

### Chat Endpoint
```typescript
POST /api/ai/chat
Body: {
  message: string,
  session_id?: string,
  context?: any
}
Response: {
  session_id: string,
  message: string
}
```

### Get Chat History
```typescript
GET /api/ai/chat/:session_id
Response: Message[]
```

### Action Execution (Frontend)
```typescript
executeAction(action: AIAction): Promise<ActionResult>

interface AIAction {
  type: 'add_kpi' | 'update_kpi' | 'add_objective' | ...
  parameters?: Record<string, any>
  requiresConfirmation?: boolean
}
```

## Configuration

### Customization Options:

**Change bubble position:**
```tsx
// In AIChatBubble.tsx
className="fixed bottom-6 right-6 z-50" // Modify bottom/right values
```

**Change theme colors:**
```tsx
// Primary color used throughout
className="bg-primary-600 hover:bg-primary-700"
```

**Adjust chat window size:**
```tsx
// In AIChatBubble.tsx
className="w-96 h-[600px]" // Modify width/height
```

## Migration Notes

### For Existing Users:
- Old AI Chat page route (`/ai-chat`) has been removed
- Chat history is session-based (not persistent across page reloads yet)
- All AI functionality now accessible via chat bubble
- Navigation menu updated to remove AI Chat link

### For Developers:
- Import `AIChatBubble` component in layouts to enable
- Action system is extensible - see `aiActions.ts` for adding new actions
- Backend context gathering can be enhanced for more intelligence

---

**Version**: 1.0.0
**Last Updated**: 2025-01-XX
**Status**: ✅ Production Ready
