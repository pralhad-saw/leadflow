const jwt = require('jsonwebtoken');

const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * The token carries brokerageId, but the server NEVER trusts it blindly --
 * `protect` re-reads the user from Mongo on every request. The claim is only
 * a hint / debug aid; the DB row is the source of truth.
 */
function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      brokerageId: user.brokerageId ? user.brokerageId.toString() : null,
      tv: user.tokenVersion ?? 0, // token version -> lets us revoke old tokens
    },
    process.env.JWT_SECRET,
    { expiresIn: EXPIRES_IN, issuer: 'leadflow' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { issuer: 'leadflow' });
}

module.exports = { signToken, verifyToken, EXPIRES_IN };
