const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  google_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  picture: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  last_login: {
    type: Date,
    default: Date.now
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for display name
userSchema.virtual('display_name').get(function() {
  return this.name || this.email.split('@')[0];
});

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.last_login = new Date();
  return this.save();
};

// Static method to find or create user
userSchema.statics.findOrCreate = async function(profile) {
  let user = await this.findOne({ google_id: profile.id });
  
  if (!user) {
    user = new this({
      google_id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      picture: profile.photos[0].value
    });
    await user.save();
  } else {
    // Update user info if it has changed
    user.name = profile.displayName;
    user.picture = profile.photos[0].value;
    await user.updateLastLogin();
  }
  
  return user;
};

module.exports = mongoose.model('User', userSchema);
