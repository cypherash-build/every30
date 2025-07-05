/* global __app_id, __firebase_config, __initial_auth_token */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Utensils,
  Dumbbell,
  ShoppingCart,
  BookOpenText,
  Flame,
  Clock,
  Info,
  CheckCircle,
  XCircle,
  Leaf
} from 'lucide-react';

// Firebase imports (boilerplate for Canvas environment, not used in this app's core logic)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

function App() {
  const [currentDay, setCurrentDay] = useState(1);
  const [activeTab, setActiveTab] = useState('diet'); // 'diet' or 'exercise'
  const totalDays = 30;

  // State to store overall meal completion status for each meal of each day (persists)
  // Structure: { day1: { breakfast: true, midMorningSnack: false, ... }, day2: { ... } }
  const [mealCompletion, setMealCompletion] = useState(() => {
    try {
      const savedCompletion = localStorage.getItem('mealCompletion');
      return savedCompletion ? JSON.parse(savedCompletion) : {};
    } catch (error) {
      console.error("Failed to parse meal completion from localStorage:", error);
      return {};
    }
  });

  // Local state for individual checklist items within a meal (does NOT persist across day changes/reloads)
  const [checklistStates, setChecklistStates] = useState({});

  // Reset checklist states when currentDay changes
  useEffect(() => {
    setChecklistStates({});
  }, [currentDay]);


  const [streak, setStreak] = useState(0);
  const [daysAccomplished, setDaysAccomplished] = useState(0);

  // Firebase Initialization (boilerplate, not actively used for this app's functionality)
  // eslint-disable-next-line no-unused-vars
  const [db, setDb] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [auth, setAuth] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    try {
      // Global variables for Firebase (boilerplate for Canvas environment)
      // eslint-disable-next-line no-unused-vars
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
      const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

      // Dummy API key for Gemini API (as per instructions, leave empty)
      // eslint-disable-next-line no-unused-vars
      const API_KEY = "";

      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          // Sign in anonymously if no initial auth token is provided
          if (!initialAuthToken) {
            await signInAnonymously(firebaseAuth);
          }
        }
        setIsAuthReady(true);
      });

      // Attempt to sign in with custom token if available
      const signIn = async () => {
        if (initialAuthToken) {
          try {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
          } catch (error) {
            console.error("Error signing in with custom token:", error);
            await signInAnonymously(firebaseAuth); // Fallback to anonymous
          }
        } else {
          await signInAnonymously(firebaseAuth);
        }
      };

      if (!isAuthReady) { // Only sign in if auth is not ready yet
        signIn();
      }

      return () => unsubscribe();
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      setIsAuthReady(true); // Mark as ready even if failed, to avoid blocking UI
    }
  }, [isAuthReady]); // Added isAuthReady to dependency array

  // Save meal completion to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('mealCompletion', JSON.stringify(mealCompletion));
    } catch (error) {
      console.error("Failed to save meal completion to localStorage:", error);
    }
  }, [mealCompletion]);

  const navigateDay = (direction) => {
    setCurrentDay(prev => {
      let newDay = prev + direction;
      // Prevent navigating past totalDays or before day 1
      if (newDay < 1) return totalDays;
      if (newDay > totalDays) return 1;

      // Logic for unlocking next day
      if (direction > 0) { // Trying to go to next day
        // Check if the current day is fully accomplished before allowing to move forward
        const currentDayMeals = plans[prev - 1].diet;
        const isCurrentDayFullyDone = Object.keys(currentDayMeals).every(meal => mealCompletion[`day${prev}`]?.[meal]);
        if (!isCurrentDayFullyDone) {
          // If current day is not done, prevent moving to the next day
          return prev;
        }
      }
      return newDay;
    });
  };

  const commonShoppingList = [
    "Fresh Vegetables: Spinach, Broccoli, Bell Peppers (various colors), Tomatoes, Onions, Green Chilies, Ginger, Garlic, Cucumber, Carrots, Radish, Cauliflower, Beans, Cabbage, Zucchini, Lauki (bottle gourd)",
    "Lean Protein: Eggs, Low-fat Paneer, Greek Yogurt (plain)",
    "Lentils & Beans: Moong Dal (split green gram), Masoor Dal (red lentil), Chana Dal (split Bengal gram), Whole Moong (green gram), Chickpeas (Chole), Kidney Beans (Rajma)",
    "Grains: Brown Rice, Quinoa, Whole Wheat Flour (Atta), Bajra Flour, Jowar Flour",
    "Healthy Fats: Olive Oil, Mustard Oil (small bottle), Almonds, Walnuts, Chia Seeds, Flax Seeds, Avocado",
    "Spices: Turmeric Powder, Red Chili Powder, Coriander Powder, Cumin Powder, Garam Masala, Chaat Masala, Black Salt, Asafoetida (Hing), Mustard Seeds, Cumin Seeds, Fenugreek Seeds, Curry Leaves, Ajwain",
    "Other: Lemon/Lime, Sugar-free Gum, Unsweetened Almond Milk (optional)"
  ];

  const plans = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const isRestDay = (day % 3 === 0 || day % 6 === 0); // Active recovery/core on Day 3, 6, 9... Rest on Day 7, 14...

    const diet = {
      breakfast: {
        dish: day % 3 === 0 ? "Sprouted Moong Dal Salad" : (day % 2 === 0 ? "Besan Cheela" : "Spicy Egg Bhurji"),
        whatToMake: [
          { type: 'subtitle', text: 'Spicy Egg Bhurji:' },
          { type: 'item', text: '• 3-4 egg whites + 1 whole egg' },
          { type: 'item', text: '• 1/2 small onion, 1/2 tomato, 1 green chili' },
          { type: 'item', text: '• Small piece ginger, fresh coriander' },
          { type: 'item', text: '• Spices (turmeric, red chili, salt)' },
          { type: 'subtitle', text: 'Besan Cheela:' },
          { type: 'item', text: '• 1/2 cup besan (gram flour)' },
          { type: 'item', text: '• 1/4 cup finely chopped mixed veggies (onion, bell pepper, spinach)' },
          { type: 'item', text: '• 1 green chili, small piece ginger, fresh coriander' },
          { type: 'item', text: '• Spices (turmeric, red chili, ajwain, salt)' },
          { type: 'subtitle', text: 'Sprouted Moong Dal Salad:' },
          { type: 'item', text: '• 1 cup sprouted moong dal' },
          { type: 'item', text: '• 1/2 cucumber, 1/2 tomato, 1/4 onion' },
          { type: 'item', text: '• 1 green chili, fresh coriander' },
          { type: 'item', text: '• Lemon juice, chaat masala, black salt' }
        ],
        howToMake: [
          { type: 'subtitle', text: 'Spicy Egg Bhurji:' },
          { type: 'item', text: '1. Heat 1 tsp oil in a non-stick pan. Sauté finely chopped onion until translucent.' },
          { type: 'item', text: '2. Add ginger-garlic paste (or grated), green chili, and chopped tomato. Cook until soft.' },
          { type: 'item', text: '3. Add turmeric, red chili powder, and salt. Whisk eggs and egg whites, pour into pan. Scramble until cooked.' },
          { type: 'item', text: '4. Garnish with fresh coriander.' },
          { type: 'subtitle', text: 'Besan Cheela:' },
          { type: 'item', text: '1. In a bowl, mix besan with water to form a smooth, thin batter (like pancake batter).' },
          { type: 'item', text: '2. Add all chopped veggies, ginger, green chili, coriander, and spices.' },
          { type: 'item', text: '3. Heat a non-stick tawa, lightly grease with a few drops of oil.' },
          { type: 'item', text: '4. Pour a ladleful of batter and spread into a thin circle. Cook on medium heat until golden brown on both sides.' },
          { type: 'subtitle', text: 'Sprouted Moong Dal Salad:' },
          { type: 'item', text: '1. In a bowl, combine sprouted moong dal with all chopped vegetables, green chili, and coriander.' },
          { type: 'item', text: '2. Add lemon juice, chaat masala, and black salt. Toss well and serve fresh.' }
        ],
        shopList: [
          { type: 'item', text: '• For Egg Bhurji: Eggs, Onion, Tomato, Green Chili, Ginger, Coriander.' },
          { type: 'item', text: '• For Besan Cheela: Besan (Gram Flour), Onion, Bell Pepper, Spinach, Green Chili, Ginger, Coriander.' },
          { type: 'item', text: '• For Sprouted Moong Dal Salad: Whole Moong (to sprout at home or buy pre-sprouted), Cucumber, Tomato, Onion, Green Chili, Coriander, Lemon.' }
        ]
      },
      midMorningSnack: {
        dish: "Plain Greek Yogurt with Cumin/Chili",
        whatToMake: [
          { type: 'item', text: '• 1 cup plain Greek yogurt' },
          { type: 'item', text: '• 1/4 tsp roasted cumin powder' },
          { type: 'item', text: '• Pinch of black salt' },
          { type: 'item', text: '• Pinch of red chili powder' }
        ],
        howToMake: [
          { type: 'item', text: '1. Mix all ingredients in a bowl.' },
          { type: 'item', text: '2. Enjoy.' }
        ],
        shopList: [
          { type: 'item', text: '• Plain Greek Yogurt' },
          { type: 'item', text: '• Cumin Powder' },
          { type: 'item', text: '• Red Chili Powder' },
          { type: 'item', text: '• Black Salt' }
        ]
      },
      lunch: {
        dish: day % 2 === 0 ? "Spicy Mixed Vegetable Sabzi with 1 Whole Wheat Roti" : "Masoor Dal (Red Lentil) with Brown Rice",
        whatToMake: [
          { type: 'subtitle', text: 'Spicy Mixed Vegetable Sabzi:' },
          { type: 'item', text: '• 1 cup mixed non-starchy vegetables (broccoli, bell peppers, beans, spinach)' },
          { type: 'item', text: '• 1/2 onion, 1/2 tomato, 1 green chili' },
          { type: 'item', text: '• Ginger-garlic paste, spices (turmeric, red chili, coriander, cumin, garam masala)' },
          { type: 'item', text: '• 1-2 thin whole wheat rotis' },
          { type: 'subtitle', text: 'Masoor Dal with Brown Rice:' },
          { type: 'item', text: '• 1/2 cup masoor dal' },
          { type: 'item', text: '• 1/2 onion, 1/2 tomato, 1 green chili' },
          { type: 'item', text: '• Ginger-garlic paste, spices (turmeric, red chili, coriander)' },
          { type: 'item', text: '• Tempering ingredients (mustard seeds, cumin seeds, curry leaves, hing)' },
          { type: 'item', text: '• 1/2 cup cooked brown rice' }
        ],
        howToMake: [
          { type: 'subtitle', text: 'Spicy Mixed Vegetable Sabzi:' },
          { type: 'item', text: '1. Heat 1 tsp oil in a non-stick pan. Sauté onion until translucent.' },
          { type: 'item', text: '2. Add ginger-garlic paste, green chili, and tomato. Cook until soft.' },
          { type: 'item', text: '3. Add all spices and cook for 1-2 minutes.' },
          { type: 'item', text: '4. Add chopped mixed vegetables and a splash of water. Cover and cook until veggies are tender-crisp.' },
          { type: 'item', text: '5. Serve with a thin whole wheat roti (made without oil/ghee).' },
          { type: 'subtitle', text: 'Masoor Dal with Brown Rice:' },
          { type: 'item', text: '1. Wash masoor dal. In a pressure cooker or pot, combine dal with 2-3 cups water, chopped onion, tomato, green chili, ginger-garlic paste, turmeric, red chili, and coriander powder.' },
          { type: 'item', text: '2. Cook until dal is soft.' },
          { type: 'item', text: '3. For tempering, heat 1 tsp oil in a small pan. Add mustard seeds, cumin seeds, curry leaves, and hing. Once spluttering, pour over the dal.' },
          { type: 'item', text: '4. Serve with measured brown rice.' }
        ],
        shopList: [
          { type: 'item', text: '• For Sabzi: Mixed Vegetables (Broccoli, Bell Peppers, Beans, Spinach), Onion, Tomato, Green Chili, Ginger, Garlic, Whole Wheat Flour.' },
          { type: 'item', text: '• For Masoor Dal: Masoor Dal (Red Lentil), Onion, Tomato, Green Chili, Ginger, Garlic, Mustard Seeds, Cumin Seeds, Curry Leaves, Hing, Brown Rice.' }
        ]
      },
      preWorkout: {
        dish: "Small Apple",
        whatToMake: [
          { type: 'item', text: '• 1 small apple.' }
        ],
        howToMake: [
          { type: 'item', text: '1. Eat it.' }
        ],
        shopList: [
          { type: 'item', text: '• Apples.' }
        ]
      },
      postWorkout: {
        dish: "Protein Shake (Water-based)",
        whatToMake: [
          { type: 'item', text: '• 1 scoop protein powder' },
          { type: 'item', text: '• 200-250ml water' }
        ],
        howToMake: [
          { type: 'item', text: '1. Mix protein powder with water in a shaker bottle until smooth.' },
          { type: 'item', text: '2. Drink immediately after workout.' }
        ],
        shopList: [
          { type: 'item', text: '• Protein Powder (Whey or Plant-based).' }
        ]
      },
      dinner: {
        dish: day % 2 === 0 ? "Spicy Paneer Bhurji with Steamed Spinach" : "Chana Dal (Split Bengal Gram) with Cucumber Salad",
        whatToMake: [
          { type: 'subtitle', text: 'Spicy Paneer Bhurji:' },
          { type: 'item', text: '• 150-200g low-fat paneer (crumbled)' },
          { type: 'item', text: '• 1/2 onion, 1/2 tomato, 1 green chili' },
          { type: 'item', text: '• Ginger-garlic paste, spices (turmeric, red chili, coriander, garam masala)' },
          { type: 'item', text: '• 1 cup steamed spinach' },
          { type: 'subtitle', text: 'Chana Dal with Cucumber Salad:' },
          { type: 'item', text: '• 1/2 cup chana dal' },
          { type: 'item', text: '• 1/2 onion, 1/2 tomato, 1 green chili' },
          { type: 'item', text: '• Ginger-garlic paste, spices (turmeric, red chili, coriander)' },
          { type: 'item', text: '• Tempering ingredients (mustard seeds, cumin seeds, curry leaves, hing)' },
          { type: 'item', text: '• 1 large cucumber, lemon, black salt, red chili powder' }
        ],
        howToMake: [
          { type: 'subtitle', text: 'Spicy Paneer Bhurji:' },
          { type: 'item', text: '1. Heat 1 tsp oil in a non-stick pan. Sauté finely chopped onion until translucent.' },
          { type: 'item', text: '2. Add ginger-garlic paste, green chili, and tomato. Cook until soft.' },
          { type: 'item', text: '3. Add all spices and cook for 1-2 minutes.' },
          { type: 'item', text: '4. Add crumbled paneer and cook for 5-7 minutes, stirring occasionally.' },
          { type: 'item', text: '5. Serve with steamed spinach.' },
          { type: 'subtitle', text: 'Chana Dal with Cucumber Salad:' },
          { type: 'item', text: '1. Wash chana dal. In a pressure cooker or pot, combine dal with 2-3 cups water, chopped onion, tomato, green chili, ginger-garlic paste, turmeric, red chili, and coriander powder.' },
          { type: 'item', text: '2. Cook until dal is soft.' },
          { type: 'item', text: '3. For tempering, heat 1 tsp oil in a small pan. Add mustard seeds, cumin seeds, curry leaves, and hing. Once spluttering, pour over the dal.' },
          { type: 'item', text: '4. For salad, chop cucumber, add lemon juice, black salt, and red chili powder.' }
        ],
        shopList: [
          { type: 'item', text: '• For Paneer Bhurji: Low-fat Paneer, Onion, Tomato, Green Chili, Ginger, Garlic, Spinach.' },
          { type: 'item', text: '• For Chana Dal: Chana Dal, Onion, Tomato, Green Chili, Ginger, Garlic, Mustard Seeds, Cumin Seeds, Curry Leaves, Hing, Cucumber, Lemon.' }
        ]
      },
      bedtime: {
        dish: "Small Bowl of Plain Greek Yogurt or 3-4 Egg Whites",
        whatToMake: [
          { type: 'item', text: '• 1/2 cup plain Greek yogurt OR 3-4 egg whites.' }
        ],
        howToMake: [
          { type: 'item', text: '1. Eat plain Greek yogurt OR scramble egg whites (without oil, just a pinch of salt).' }
        ],
        shopList: [
          { type: 'item', text: '• Plain Greek Yogurt OR Eggs.' }
        ]
      }
    };

    const exercise = isRestDay ? {
      focus: day % 7 === 0 ? "Complete Rest Day" : "Active Recovery & Core",
      warmUp: "5-10 minutes light cardio (spot jogging, arm circles)",
      workout: `
        **Active Recovery & Core:**
        * **Light Walk/Stretch:** 20-30 minutes brisk walking or gentle stretching.
        * **Plank:** 3 sets, hold for 30-60 seconds.
        * **Side Plank:** 3 sets, hold for 20-40 seconds per side.
        * **Crunches:** 3 sets of 15-20 reps.
        * **Leg Raises:** 3 sets of 15-20 reps.
        * **Bird-Dog:** 3 sets of 10-12 reps per side.
      `,
      coolDown: "5-10 minutes static stretches (holding each stretch for 20-30 seconds)."
    } : {
      focus: "Full Body & Bicep Focus",
      warmUp: "5-10 minutes light cardio (spot jogging, jumping jacks), dynamic stretches (arm circles, leg swings, torso twists).",
      workout: `
        **Bicep Specific (15kg Dumbbell):**
        * **Dumbbell Bicep Curls (Single Arm):** 3-4 sets of 8-12 reps per arm (slow eccentric).
        * **Hammer Curls (Single Arm):** 3-4 sets of 8-12 reps per arm.
        * **Concentration Curls:** 3-4 sets of 10-15 reps per arm.
        * **Reverse Curls:** 2-3 sets of 10-15 reps per arm.

        **Full Body (15kg Dumbbell):**
        * **Goblet Squat:** 3-4 sets of 10-15 reps.
        * **Single Arm Dumbbell Row:** 3-4 sets of 8-12 reps per arm.
        * **Dumbbell Floor Press (Single Arm):** 3-4 sets of 10-15 reps per arm.
        * **Overhead Dumbbell Extension (Triceps):** 3-4 sets of 10-15 reps.
        * **Lunges (Single Arm Dumbbell):** 3 sets of 10-12 reps per leg.
        * **Glute Bridges (with Dumbbell on Hips):** 3-4 sets of 15-20 reps.
        * **Dumbbell Swings (Single Arm - *careful with form*):** 3 sets of 15-20 reps per arm.

        **Jawline Specific:**
        * **Chewing:** Chew sugar-free gum frequently.
        * **Chin Lifts:** Look up, push lower jaw out, lower lip over upper. Hold 10s, 10-15 reps.
        * **Good Posture:** Maintain throughout the day.
      `,
      coolDown: "5-10 minutes static stretches, holding each for 20-30 seconds."
    };

    return { diet, exercise };
  });

  const currentPlan = plans[currentDay - 1];

  // Function to handle overall meal completion toggle (persists)
  const handleMealCompletion = useCallback((day, mealTime, isDone) => {
    setMealCompletion(prev => {
      const newCompletion = { ...prev };
      if (!newCompletion[`day${day}`]) {
        newCompletion[`day${day}`] = {};
      }
      newCompletion[`day${day}`][mealTime] = isDone;
      return newCompletion;
    });
  }, []);

  // Function to handle individual checklist item toggle (local state only)
  const handleChecklistItemToggle = useCallback((mealTime, listType, index) => {
    setChecklistStates(prev => {
      const newStates = { ...prev };
      if (!newStates[mealTime]) newStates[mealTime] = {};
      if (!newStates[mealTime][listType]) newStates[mealTime][listType] = {};
      newStates[mealTime][listType][index] = !newStates[mealTime][listType][index];
      return newStates;
    });
  }, []);

  // Calculate streak and days accomplished whenever mealCompletion changes
  useEffect(() => {
    let currentStreak = 0;
    let accomplishedCount = 0;
    let consecutive = true;

    for (let d = 1; d <= totalDays; d++) {
      const dayCompletion = mealCompletion[`day${d}`];
      const allMealsDoneForDay = dayCompletion &&
        Object.keys(plans[d - 1].diet).every(meal => dayCompletion[meal]);

      if (allMealsDoneForDay) {
        accomplishedCount++;
        if (consecutive) {
          currentStreak++;
        }
      } else {
        consecutive = false; // Break streak if a day is not fully accomplished
        // The streak should reset only if the *current* day is incomplete,
        // but if a past day was incomplete, it just prevents further streak building.
        // For simplicity, we'll reset if any day in the sequence is incomplete.
      }
    }
    setDaysAccomplished(accomplishedCount);

    // Recalculate streak more accurately: find the longest consecutive completed sequence ending at the current day or before.
    let tempStreak = 0;
    let maxStreak = 0;
    for (let d = 1; d <= totalDays; d++) {
        const dayCompletion = mealCompletion[`day${d}`];
        const allMealsDoneForDay = dayCompletion &&
            Object.keys(plans[d - 1].diet).every(meal => dayCompletion[meal]);

        if (allMealsDoneForDay) {
            tempStreak++;
        } else {
            tempStreak = 0; // Reset if day is not fully done
        }
        maxStreak = Math.max(maxStreak, tempStreak);
    }
    setStreak(maxStreak);

  }, [mealCompletion, totalDays, plans]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black font-inter text-gray-100 p-4 sm:p-6 md:p-8">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; }
          h1, h2, h3, h4, h5 { font-family: 'Poppins', sans-serif; }

          .glass-main {
            background-color: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          }

          .glass-section {
            background-color: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.2);
          }

          .glass-card {
            background-color: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            border: 1px solid rgba(255, 255, 255, 0.03);
            box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.1);
          }

          .glass-inner-detail {
            background-color: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.02);
          }

          .glass-button-primary {
            background-color: rgba(252, 211, 38, 0.8); /* yellow-400 with opacity */
            border: 1px solid rgba(252, 211, 38, 0.5);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
          }

          .glass-button-secondary {
            background-color: rgba(107, 114, 128, 0.5); /* gray-700 with opacity */
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
          }

          .checklist-item {
            cursor: pointer;
            padding: 4px 0;
            transition: all 0.2s ease-in-out;
            display: flex;
            align-items: center;
          }

          .checklist-item.completed {
            text-decoration: line-through;
            opacity: 0.6;
            color: #a0a0a0; /* A slightly darker gray for completed items */
          }
          .checklist-item .check-icon {
            margin-right: 8px;
            color: #fcd34d; /* yellow-300 */
          }
          .subtitle-text {
            font-style: italic;
            font-size: 1.125rem; /* text-lg */
            margin-top: 1rem;
            margin-bottom: 0.5rem;
            color: #fcd34d; /* yellow-300 */
          }
        `}
      </style>

      <div className="max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 md:p-10 glass-main">

        {/* Progress Indicator */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-yellow-400 mb-4 drop-shadow-sm">
            💪 Your 30-Day Progress 💪
          </h1>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto font-inter">
            Stay motivated and track your journey to a sharper jawline and stronger biceps!
          </p>

          <div className="w-full bg-gray-700 rounded-full h-4 mb-3 overflow-hidden border border-gray-600">
            <div
              className="bg-yellow-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(daysAccomplished / totalDays) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-gray-300 text-sm sm:text-base font-semibold">
            <span>Days Accomplished: <span className="text-yellow-400">{daysAccomplished}</span> / {totalDays}</span>
            <span>Current Streak: <span className="text-yellow-400">{streak}</span> days 🔥</span>
          </div>
        </div>

        {/* Day Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 p-4 rounded-2xl glass-section">
          <button
            onClick={() => navigateDay(-1)}
            className="flex items-center justify-center p-3 text-gray-900 rounded-full shadow-lg hover:bg-yellow-700 transition-all duration-300 transform hover:scale-105 mb-4 sm:mb-0 glass-button-primary"
            aria-label="Previous Day"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-grow flex flex-wrap justify-center gap-2 sm:gap-3 px-2">
            {Array.from({ length: totalDays }, (_, i) => {
              const dayNum = i + 1;
              // Day is unlocked if it's already accomplished, or it's the next day to be accomplished
              const isDayUnlocked = dayNum <= daysAccomplished + 1;
              const isCurrent = dayNum === currentDay;

              return (
                <button
                  key={dayNum}
                  onClick={() => isDayUnlocked ? setCurrentDay(dayNum) : null}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                    isCurrent
                      ? 'glass-button-primary text-gray-900 shadow-md'
                      : isDayUnlocked
                        ? 'glass-button-secondary text-yellow-300 hover:bg-gray-600'
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                  }`}
                  disabled={!isDayUnlocked}
                >
                  Day {dayNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => navigateDay(1)}
            // Next day button is enabled only if current day is not the last day AND current day is accomplished
            disabled={currentDay === totalDays || !Object.keys(currentPlan.diet).every(meal => mealCompletion[`day${currentDay}`]?.[meal])}
            className={`flex items-center justify-center p-3 text-gray-900 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 mt-4 sm:mt-0 ${
              currentDay === totalDays || !Object.keys(currentPlan.diet).every(meal => mealCompletion[`day${currentDay}`]?.[meal])
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                : 'glass-button-primary hover:bg-yellow-700'
            }`}
            aria-label="Next Day"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Day Display */}
        <div className="p-6 rounded-2xl glass-section">
          <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-6 text-center">
            Day {currentDay}
          </h2>

          {/* Tab Navigation */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setActiveTab('diet')}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-md ${
                activeTab === 'diet'
                  ? 'glass-button-primary text-gray-900 transform scale-105'
                  : 'glass-button-secondary text-yellow-300 hover:bg-gray-600'
              }`}
            >
              <Utensils size={20} /> Diet Plan
            </button>
            <button
              onClick={() => setActiveTab('exercise')}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-md ${
                activeTab === 'exercise'
                  ? 'glass-button-primary text-gray-900 transform scale-105'
                  : 'glass-button-secondary text-yellow-300 hover:bg-gray-600'
              }`}
            >
              <Dumbbell size={20} /> Workout Plan
            </button>
          </div>

          {/* Content Area */}
          {activeTab === 'diet' && (
            <div className="space-y-8">
              <h3 className="text-xl sm:text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <Utensils size={24} /> Your Daily Diet
              </h3>
              {Object.entries(currentPlan.diet).map(([mealTime, details]) => {
                const isMealDone = mealCompletion[`day${currentDay}`]?.[mealTime] || false;
                return (
                  <div key={mealTime} className={`p-6 rounded-xl glass-card transition-all duration-300 ${isMealDone ? 'bg-yellow-900/30' : ''}`}>
                    <h4 className="text-lg sm:text-xl font-semibold text-yellow-300 mb-3 capitalize flex items-center gap-2">
                      <Clock size={20} /> {mealTime.replace(/([A-Z])/g, ' $1').trim()}
                      {isMealDone && <span className="ml-2 text-yellow-400 font-bold">DONE!</span>}
                    </h4>
                    <p className="text-gray-200 mb-4 font-medium text-lg font-inter leading-relaxed">{details.dish}</p>

                    <div className="space-y-4">
                      <div className="p-4 rounded-lg glass-inner-detail">
                        <h5 className="font-semibold text-yellow-300 flex items-center gap-1.5"><BookOpenText size={18} /> What to Make:</h5>
                        <ul className="list-none space-y-1 text-gray-300 font-inter leading-relaxed">
                          {details.whatToMake.map((item, idx) => {
                            if (item.type === 'subtitle') {
                              return <p key={idx} className="subtitle-text">{item.text.replace(/\*\*/g, '')}</p>;
                            }
                            const isChecked = checklistStates[mealTime]?.whatToMake?.[idx] || false;
                            return (
                              <li
                                key={idx}
                                className={`checklist-item ${isChecked ? 'completed' : ''}`}
                                onClick={() => handleChecklistItemToggle(mealTime, 'whatToMake', idx)}
                              >
                                {isChecked ? <CheckCircle size={16} className="check-icon" /> : <span className="w-4 h-4 inline-block mr-2 border border-gray-500 rounded-sm"></span>}
                                <span dangerouslySetInnerHTML={{ __html: item.text }} />
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="p-4 rounded-lg glass-inner-detail">
                        <h5 className="font-semibold text-yellow-300 flex items-center gap-1.5"><Flame size={18} /> How to Make:</h5>
                        <ol className="list-none space-y-1 text-gray-300 font-inter leading-relaxed">
                          {details.howToMake.map((item, idx) => {
                            if (item.type === 'subtitle') {
                              return <p key={idx} className="subtitle-text">{item.text.replace(/\*\*/g, '')}</p>;
                            }
                            const isChecked = checklistStates[mealTime]?.howToMake?.[idx] || false;
                            return (
                              <li
                                key={idx}
                                className={`checklist-item ${isChecked ? 'completed' : ''}`}
                                onClick={() => handleChecklistItemToggle(mealTime, 'howToMake', idx)}
                              >
                                {isChecked ? <CheckCircle size={16} className="check-icon" /> : <span className="w-4 h-4 inline-block mr-2 border border-gray-500 rounded-sm"></span>}
                                <span dangerouslySetInnerHTML={{ __html: item.text }} />
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                      <div className="p-4 rounded-lg glass-inner-detail">
                        <h5 className="font-semibold text-yellow-300 flex items-center gap-1.5"><ShoppingCart size={18} /> What to Order from Shop:</h5>
                        <ul className="list-none space-y-1 text-gray-300 font-inter leading-relaxed">
                          {details.shopList.map((item, idx) => {
                            if (item.type === 'subtitle') {
                              return <p key={idx} className="subtitle-text">{item.text.replace(/\*\*/g, '')}</p>;
                            }
                            const isChecked = checklistStates[mealTime]?.shopList?.[idx] || false;
                            return (
                              <li
                                key={idx}
                                className={`checklist-item ${isChecked ? 'completed' : ''}`}
                                onClick={() => handleChecklistItemToggle(mealTime, 'shopList', idx)}
                              >
                                {isChecked ? <CheckCircle size={16} className="check-icon" /> : <span className="w-4 h-4 inline-block mr-2 border border-gray-500 rounded-sm"></span>}
                                <span dangerouslySetInnerHTML={{ __html: item.text }} />
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      {/* Editable DONE section */}
                      <div className="mt-4 p-3 rounded-lg glass-inner-detail">
                        <label htmlFor={`meal-done-${currentDay}-${mealTime}`} className="font-semibold text-yellow-300 flex items-center gap-1.5 mb-2">
                          <CheckCircle size={18} /> Mark as Done:
                        </label>
                        <input
                          id={`meal-done-${currentDay}-${mealTime}`}
                          type="text"
                          placeholder="Type 'DONE' to mark as complete"
                          className="w-full p-2 bg-gray-900 text-yellow-200 rounded-md border border-gray-700 focus:outline-none focus:ring-1 focus:ring-yellow-500 transition-all duration-200"
                          value={isMealDone ? "DONE" : ""}
                          onChange={(e) => {
                            const value = e.target.value.trim().toLowerCase();
                            handleMealCompletion(currentDay, mealTime, value === 'done');
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.trim().toLowerCase();
                            handleMealCompletion(currentDay, mealTime, value === 'done');
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur(); // Trigger onBlur to save
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'exercise' && (
            <div className="space-y-6">
              <h3 className="text-xl sm:text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <Dumbbell size={24} /> Your Daily Workout
              </h3>
              <div className="p-6 rounded-xl glass-card">
                <h4 className="text-lg sm:text-xl font-semibold text-yellow-300 mb-3 flex items-center gap-2">
                  <Info size={20} /> Focus: {currentPlan.exercise.focus}
                </h4>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg glass-inner-detail">
                    <h5 className="font-semibold text-yellow-300 flex items-center gap-1.5"><CheckCircle size={18} /> Warm-up:</h5>
                    <p className="text-gray-300 font-inter leading-relaxed">{currentPlan.exercise.warmUp}</p>
                  </div>
                  <div className="p-4 rounded-lg glass-inner-detail">
                    <h5 className="font-semibold text-yellow-300 flex items-center gap-1.5"><Dumbbell size={18} /> Workout:</h5>
                    <div className="prose prose-sm max-w-none text-gray-300 font-inter leading-relaxed" dangerouslySetInnerHTML={{ __html: currentPlan.exercise.workout.replace(/\n/g, '<br/>') }} />
                  </div>
                  <div className="p-4 rounded-lg glass-inner-detail">
                    <h5 className="font-semibold text-yellow-300 flex items-center gap-1.5"><XCircle size={18} /> Cool-down:</h5>
                    <p className="text-gray-300 font-inter leading-relaxed">{currentPlan.exercise.coolDown}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* General Shopping List */}
        <div className="mt-12 p-6 rounded-2xl glass-section">
          <h3 className="text-xl sm:text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
            <ShoppingCart size={24} /> Your 30-Day Master Shopping List
          </h3>
          <p className="text-gray-300 mb-4 font-inter leading-relaxed">
            Here's a comprehensive list of items you'll need throughout your 30-day journey.
            Stock up on these essentials!
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 font-inter leading-relaxed">
            {commonShoppingList.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2 text-yellow-500 mt-0.5"><Leaf size={18} /></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-400 mt-4 font-inter leading-relaxed">
            <Info size={16} className="inline-block mr-1" /> Remember to adjust quantities based on your household size and consumption.
          </p>
        </div>

        {/* Important Notes */}
        <div className="mt-12 p-6 rounded-2xl glass-section">
          <h3 className="text-xl sm:text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
            <Info size={24} /> Important Notes
          </h3>
          <ul className="list-disc list-inside space-y-3 text-gray-300 font-inter leading-relaxed">
            <li>
              <span className="font-semibold">Portion Control:</span> Even with healthy Indian dishes, portion control is crucial for fat loss. Stick to the suggested quantities.
            </li>
            <li>
              <span className="font-semibold">Cooking Oil:</span> Use minimal oil (1-2 tsp per dish for cooking/tempering). Prefer olive oil or mustard oil.
            </li>
            <li>
              <span className="font-semibold">No Added Sugar:</span> Absolutely no added sugar in any form (including jaggery, honey, etc. unless specified for a tiny amount in a specific context like a natural sweetener for a drink, which is not in this plan).
            </li>
            <li>
              <span className="font-semibold">Hydration:</span> Drink 3-4 liters of water daily. Green tea is also recommended.
            </li>
            <li>
              <span className="font-semibold">Sleep & Recovery:</span> Aim for 7-9 hours of quality sleep. It's vital for muscle repair and fat loss.
            </li>
            <li>
              <span className="font-semibold">Listen to Your Body:</span> If you feel excessive fatigue or pain, take an extra rest day or modify your workout.
            </li>
            <li>
              <span className="font-semibold">Consistency is Key:</span> Adherence to both diet and exercise is paramount for results in 30 days.
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default App;
