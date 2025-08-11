const User = require('../models/user');
const cron = require('node-cron');

// Function to reset message usage for all users
const resetMonthlyMessageUsage = async () => {
  try {
    console.log('Starting monthly message usage reset...');
    
    const result = await User.updateMany(
      { 
        isSubscribed: false, // Only reset for free users
        messagesUsed: { $gt: 0 } // Only users who have used messages
      },
      { 
        $set: { messagesUsed: 0 } 
      }
    );
    
    console.log(`Monthly message reset completed. ${result.modifiedCount} users reset.`);
    return result;
  } catch (error) {
    console.error('Error resetting monthly message usage:', error);
    throw error;
  }
};

// Function to clean up expired subscriptions
const cleanupExpiredSubscriptions = async () => {
  try {
    console.log('Checking for expired subscriptions...');
    
    const expiredUsers = await User.find({
      isSubscribed: true,
      subscriptionPeriodEnd: { $lt: new Date() }
    });
    
    let downgradeCount = 0;
    for (const user of expiredUsers) {
      await user.downgradeToFree();
      downgradeCount++;
    }
    
    console.log(`Expired subscription cleanup completed. ${downgradeCount} users downgraded.`);
    return downgradeCount;
  } catch (error) {
    console.error('Error cleaning up expired subscriptions:', error);
    throw error;
  }
};

// Function to get subscription analytics
const getSubscriptionAnalytics = async () => {
  try {
    const analytics = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          freeUsers: {
            $sum: { $cond: [{ $eq: ['$isSubscribed', false] }, 1, 0] }
          },
          premiumUsers: {
            $sum: { $cond: [{ $eq: ['$isSubscribed', true] }, 1, 0] }
          },
          avgMessagesUsed: { $avg: '$messagesUsed' },
          totalMessagesUsed: { $sum: '$messagesUsed' },
          expiredSubscriptions: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$isSubscribed', true] },
                    { $lt: ['$subscriptionPeriodEnd', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    return analytics[0] || {};
  } catch (error) {
    console.error('Error getting subscription analytics:', error);
    throw error;
  }
};

// Initialize cron jobs
const initializeSubscriptionCronJobs = () => {
  // Reset message usage on the 1st of each month at 00:00
  cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly message usage reset cron job...');
    try {
      await resetMonthlyMessageUsage();
    } catch (error) {
      console.error('Cron job error (message reset):', error);
    }
  });

  // Check for expired subscriptions daily at 02:00
  cron.schedule('0 2 * * *', async () => {
    console.log('Running daily subscription cleanup cron job...');
    try {
      await cleanupExpiredSubscriptions();
    } catch (error) {
      console.error('Cron job error (subscription cleanup):', error);
    }
  });

  console.log('Subscription cron jobs initialized');
};

module.exports = {
  resetMonthlyMessageUsage,
  cleanupExpiredSubscriptions,
  getSubscriptionAnalytics,
  initializeSubscriptionCronJobs
};
