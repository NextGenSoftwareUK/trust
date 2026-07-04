const { getBearerToken, createClient } = require('./_oasis');

// Map of internal action names to OASIS KarmaTypePositive enum values.
const ACTION_KARMA_TYPES = {
  AccountCreated: 'Other',
  TrustCompleted: 'SelfHelpImprovement',
  TrustDocumentGenerated: 'ContributingToTheOASIS'
};

const ACTION_TITLES = {
  AccountCreated: 'SovereignTrust Account Created',
  TrustCompleted: 'Trust Profile Completed',
  TrustDocumentGenerated: 'Trust Deed Generated'
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const { avatarId, action } = req.body || {};
  const karmaType = ACTION_KARMA_TYPES[action];

  if (!avatarId || !karmaType) {
    return res.status(400).json({ error: 'avatarId and a valid action are required.' });
  }

  try {
    const oasis = createClient(token);
    const karmaRes = await oasis.karma.addKarmaToAvatar({
      avatarId,
      KarmaType: karmaType,
      karmaSourceType: 'Website',
      KaramSourceTitle: ACTION_TITLES[action],
      KarmaSourceDesc: `Awarded by SovereignTrust for: ${ACTION_TITLES[action]}`
    });

    console.log('[karma-award] avatarId:', avatarId, 'action:', action, 'karmaType:', karmaType);
    console.log('[karma-award] OASIS response:', JSON.stringify(karmaRes));

    if (karmaRes.isError) {
      return res.status(400).json({ error: karmaRes.message || 'Karma award failed.', _debug: { avatarId, karmaType, raw: karmaRes.raw } });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[karma-award]', err);
    return res.status(500).json({ error: 'Failed to award karma.' });
  }
};
