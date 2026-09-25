export type AIResponseType = 
  | 'text'
  | 'fleet_summary'
  | 'vehicle_list'
  | 'trip_summary'
  | 'driver_summary'
  | 'maintenance_alert'
  | 'fuel_summary';

export interface AIResponse {
  success: boolean;
  intent: string;
  type: AIResponseType;
  message: string;
  data?: any;
  suggestions?: string[];
}

const MOCK_INTENTS: Record<string, AIResponse> = {
  'active_vehicles': {
    success: true,
    intent: 'ACTIVE_VEHICLES',
    type: 'fleet_summary',
    message: 'You currently have 18 active vehicles.\n\n• 12 vehicles are moving\n• 4 vehicles are idle\n• 2 vehicles are stopped\n\nFleet utilization: 82%',
    data: { total: 18, moving: 12, idle: 4, stopped: 2, utilization: 82 },
    suggestions: ['📍 Where are my vehicles right now?', '⚠️ Which vehicles are currently stopped?'],
  },
  'vehicle_locations': {
    success: true,
    intent: 'VEHICLE_LOCATIONS',
    type: 'vehicle_list',
    message: 'Your fleet currently has:\n\n12 vehicles moving\n4 vehicles near Ahmedabad\n2 vehicles near Jaipur\n\n3 vehicles are currently outside their planned route.',
    data: [
      { id: 'GJ01AB1234', status: 'Moving', speed: '42 km/h' },
      { id: 'GJ01CD5678', status: 'Idle', speed: '0 km/h' },
      { id: 'GJ01EF9012', status: 'Moving', speed: '36 km/h' },
    ],
    suggestions: ['🚚 Show active vehicles', '🛣️ Show today\'s trip summary'],
  },
  'trip_summary': {
    success: true,
    intent: 'TRIP_SUMMARY',
    type: 'trip_summary',
    message: 'Today\'s trip summary:\n\n24 Total Trips\n18 Completed\n4 In Progress\n2 Delayed\n\nOn-time completion: 87%',
    data: { total: 24, completed: 18, inProgress: 4, delayed: 2, onTimeRatio: 87 },
    suggestions: ['⏱️ Which trips are delayed?', '👨‍✈️ Show driver performance'],
  },
  'delayed_trips': {
    success: true,
    intent: 'DELAYED_TRIPS',
    type: 'text',
    message: 'I found 2 delayed trips.\n\nTrip #TR-1042\nDelay: 32 minutes\n\nTrip #TR-1088\nDelay: 18 minutes',
    suggestions: ['📍 Where are my vehicles right now?'],
  },
  'driver_performance': {
    success: true,
    intent: 'DRIVER_PERFORMANCE',
    type: 'driver_summary',
    message: 'Driver performance summary:\n\nTop performer:\nRaj Patel — 94%\n\nNeeds attention:\nAmit Sharma — 68%\n\nAverage driver score:\n82%',
    data: { top: { name: 'Raj Patel', score: 94 }, bottom: { name: 'Amit Sharma', score: 68 }, average: 82 },
    suggestions: ['⚠️ Which drivers need attention?', '🚚 Show active vehicles'],
  },
  'maintenance': {
    success: true,
    intent: 'MAINTENANCE_ALERT',
    type: 'maintenance_alert',
    message: 'Upcoming maintenance:\n\n3 vehicles require service within 7 days.\n\nGJ01AB1234\nService due in 2 days\n\nGJ01CD5678\nService due in 4 days\n\nGJ01EF9012\nService due in 6 days',
    data: [
      { id: 'GJ01AB1234', dueIn: '2 days' },
      { id: 'GJ01CD5678', dueIn: '4 days' },
      { id: 'GJ01EF9012', dueIn: '6 days' },
    ],
    suggestions: ['🚨 Which vehicles need maintenance?'],
  },
  'fuel_summary': {
    success: true,
    intent: 'FUEL_SUMMARY',
    type: 'fuel_summary',
    message: 'Today\'s fuel summary:\n\nTotal fuel consumed: 426 L\n\nAverage consumption:\n6.8 km/L\n\n3 vehicles show higher-than-normal fuel consumption.',
    data: { total: 426, average: 6.8, highConsumptionCount: 3 },
    suggestions: ['📊 Which vehicles have high fuel consumption?'],
  },
};

const FALLBACK_RESPONSE: AIResponse = {
  success: false,
  intent: 'UNKNOWN',
  type: 'text',
  message: 'I\'m currently able to help with:\n\n• Fleet status\n• Vehicle tracking\n• Trips\n• Drivers\n• Maintenance\n• Fuel\n\nTry selecting one of the suggested questions.',
  suggestions: ['🚚 Show active vehicles', '🛣️ Show today\'s trip summary'],
};

// Map raw user input text strings to predefined intents
const NLP_MAP: Record<string, string> = {
  'show active vehicles': 'active_vehicles',
  'where are my vehicles right now?': 'vehicle_locations',
  'show vehicle locations': 'vehicle_locations',
  'which vehicles are currently stopped?': 'active_vehicles', // Simplified
  'view stopped vehicles': 'active_vehicles',
  'show today\'s trip summary': 'trip_summary',
  'which trips are delayed?': 'delayed_trips',
  'show delayed trips': 'delayed_trips',
  'show driver performance': 'driver_performance',
  'which drivers need attention?': 'driver_performance',
  'show upcoming maintenance': 'maintenance',
  'show maintenance alerts': 'maintenance',
  'which vehicles need maintenance?': 'maintenance',
  'show today\'s fuel summary': 'fuel_summary',
  'show fuel summary': 'fuel_summary',
  'which vehicles have high fuel consumption?': 'fuel_summary',
};

/**
 * Mock AI Assistant Service
 * Once your backend is ready, replace this function body with a real API call.
 */
export const mockAiAssistantService = async (query: string): Promise<AIResponse> => {
  return new Promise((resolve) => {
    // Simulate AI processing delay (500ms to 1500ms)
    const delay = Math.floor(Math.random() * 1000) + 500;
    
    setTimeout(() => {
      const normalizedQuery = query.toLowerCase().replace(/🚚|📍|⚠️|🛣️|⏱️|👨‍✈️|🔧|🚨|⛽|📊/g, '').trim();
      
      const intentKey = NLP_MAP[normalizedQuery];
      
      if (intentKey && MOCK_INTENTS[intentKey]) {
        resolve(MOCK_INTENTS[intentKey]);
      } else {
        // Fallback for unknown queries
        resolve(FALLBACK_RESPONSE);
      }
    }, delay);
  });
};
