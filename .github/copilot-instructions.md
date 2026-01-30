# GitHub Copilot Instructions

## ⚠️ CRITICAL RULES - READ FIRST ⚠️

### Version Management (MANDATORY)
**BEFORE making ANY code changes to game files:**

1. ✅ **INCREMENT VERSION FIRST** - Update both lines at the top of `game/game.js`:
   ```javascript
   // Version 0.X
   const VERSION = 'v0.X';
   ```
2. ✅ Increment by 0.1 (e.g., v0.6 → v0.7)
3. ✅ Make your code changes
4. ✅ **REGENERATE EMBED FILE** - Run `cd game; .\build-embed.ps1` to rebuild `game-embed.js`
5. ✅ Commit with version in message: `"v0.X: Description of changes"`

**This is the #1 item on the code review checklist and MUST NOT be skipped.**

### Commit Standards
- Always include version number in commit message for game changes
- **Keep commit messages concise** - 3-5 bullet points max
- Use descriptive commit messages explaining what changed and why
- Stage all related files together

### Code Quality
- Read `game/CONTRIBUTING.md` for full guidelines
- Follow existing code patterns and style
- Test changes before committing
- No dead code or unused variables
- Use constants from CONFIG object when available

### Mobile Support
- Consider mobile/touch interactions for all UI changes
- Test landscape orientation requirements
- Ensure touch controls remain functional

---

**If you forget to increment the version, you have failed the most basic requirement of this codebase.**
