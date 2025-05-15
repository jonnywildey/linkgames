# Link Maze Game

A fun web-based maze game that requires users to solve a maze to reveal a hidden link. The maze is generated based on the base64-encoded link provided as a URL parameter.

## How to Use

1. Encode your link in base64 format
2. Add it as a query parameter to the URL: `index.html?link=BASE64_ENCODED_LINK`
3. Share the URL with others
4. They must navigate the maze to reveal the original link

## Example

Let's say you want to share the link `https://example.com`:

1. Encode it to base64: `aHR0cHM6Ly9leGFtcGxlLmNvbQ==`
2. Create the URL: `index.html?link=aHR0cHM6Ly9leGFtcGxlLmNvbQ==`
3. Share this URL

## How to Encode Links to Base64

You can use various online tools or browser console to encode links:

### Using Browser Console:
```javascript
btoa("https://example.com")
// Returns: "aHR0cHM6Ly9leGFtcGxlLmNvbQ=="
```

### Using Online Tools:
- Visit [Base64 Encode](https://www.base64encode.org/)
- Enter your URL in the input field
- Click "Encode" to get the base64 version

## Playing the Game

- Use arrow keys (or WASD) to navigate through the maze
- Alternatively, use the on-screen buttons
- Reach the green exit square to reveal the hidden link

## Technical Details

- The base64-encoded link is used as a seed to generate a unique maze
- Longer links create more complex mazes (difficulty scales with URL length)
- The maze is created using a combination of:
  - Recursive backtracking algorithm
  - Random path generation
  - Cellular automata-inspired techniques
- Adaptive difficulty ensures all mazes have a valid solution
- HTML5 Canvas is used for rendering
- No external libraries required

## Maze Complexity Features

- 25x25 grid size for more challenging navigation
- Random dead ends and loops increase difficulty
- Maze complexity adapts to the length of the encoded URL
- Guaranteed valid path from start to exit
- Small open areas at start and exit for easier entry/exit points

## Local Development

Simply open the `index.html` file in your browser or serve the files with a local server:

```bash
# Using Python's built-in HTTP server
python -m http.server

# Or with Node.js/npm
npx serve
```

Then visit `http://localhost:8000` (or the port provided by your server).

## License

Feel free to use and modify as needed! 