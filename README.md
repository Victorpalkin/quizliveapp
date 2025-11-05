# QuizLive

QuizLive is an interactive, real-time quiz application that allows users to host live quiz games and have players join and compete from their own devices. It's built with a modern web stack and leverages Firebase for its backend services and Google's Generative AI for content creation assistance.

## Features

### Host Features
- **Authentication**: Secure sign-in for hosts to manage their quizzes.
- **Quiz Creation**: A user-friendly interface to create custom quizzes with multiple-choice questions.
- **AI Question Suggester**: Get a little help from AI to generate questions on any topic.
- **Quiz Management**: View, edit, and delete all your created quizzes from a central dashboard.
- **Game Hosting**: Launch a live game session from any of your quizzes.
- **Game Lobby**: A waiting room for players to join using a unique, auto-generated Game PIN.
- **Live Game Management**:
  - Start the game when you're ready.
  - Advance through questions manually or let the game auto-advance when all players have answered.
  - View a real-time count of how many players have answered.
  - See a distribution chart of player answers after each question.
  - Cancel the game at any point.
- **Game History**: View final leaderboards for completed games.

### Player Features
- **Easy Join**: Players can quickly join a game using a simple Game PIN without needing an account.
- **Nickname Selection**: Choose a nickname to appear on the leaderboard.
- **Real-time Gameplay**:
  - See questions appear on your screen as the host presents them.
  - Answer questions within the time limit.
  - Receive instant feedback on your answer (correct/incorrect) and points awarded.
- **Game Status Updates**: Get notified if the host starts or cancels the game, and smoothly transition between questions and results.
- **Final Results**: See your final score and rank when the quiz is over.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [ShadCN UI](https://ui.shadcn.com/) components.
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication & Firestore)
- **Generative AI**: [Firebase Genkit](https://firebase.google.com/docs/genkit) with Google's Gemini models.

## Getting Started

### 1. Environment Variables
To run the application locally, you need to set up your environment variables. Create a `.env` file in the root of the project and add the following:

```
GEMINI_API_KEY=your_google_ai_api_key
```

- **`GEMINI_API_KEY`**: This is your secret key for accessing the Google AI (Gemini) models, which powers the AI Question Suggester. You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Firebase Setup
This project is configured to use Firebase for authentication and as its database.

1.  **Firebase Project**: The app is connected to a Firebase project. If you are running this locally through a tool like Firebase Studio, this is managed for you.
2.  **Authentication**: The app uses Firebase Authentication with the "Email/Password" sign-in method for hosts. To create a host user:
    - Go to the **Firebase Console** and select your project.
    - Navigate to **Authentication** > **Users** tab.
    - Click **"Add user"** and provide an email and password. You can then use these credentials to log in to the app's `/login` page.
3.  **Firestore Rules**: The database is secured with Firestore Security Rules. These rules are managed automatically within the development environment.

### 3. Running the Development Server
Once your environment variables are set, you can start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## Available Pages

- `/`: The home page where users can choose to host or join a game.
- `/login`: The sign-in page for hosts.
- `/host`: The host's dashboard to view, create, and manage quizzes and games.
- `/host/create`: The page for creating a new quiz.
- `/host/edit/[quizId]`: The page for editing an existing quiz.
- `/host/lobby/[gameId]`: The lobby screen for a game you are hosting.
- `/host/game/[gameId]`: The live game screen for the host, showing questions and leaderboards.
- `/join`: The page for players to enter a Game PIN.
- `/play/[gameId]`: The game screen for players participating in a quiz.
