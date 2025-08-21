@@ .. @@
  const saveCredentials = async () => {
    if (!currentUser) return;
    
    if (!accessToken.trim() || !pageId.trim()) {
      setValidationMessage('❌ Please enter both Access Token and Page ID');
      return;
    }

    setIsSaving(true);

    try {
      const credentialData = {
        type: 'facebook',
        accessToken: accessToken.trim(),
        pageId: pageId.trim(),
        expiryDate: expiryDate || '',
        createdAt: new Date().toISOString(),
        lastValidated: new Date().toISOString()
      };

      console.log('Saving Facebook credentials:', {
        type: credentialData.type,
        hasAccessToken: !!credentialData.accessToken,
        hasPageId: !!credentialData.pageId,
        userId: currentUser.uid
      });

      await saveCredential(currentUser.uid, credentialData);
      setValidationMessage('✅ Credentials saved successfully!');
      await loadSavedCredentials();
    } catch (error) {
      console.error('Error saving Facebook credentials:', error);
      setValidationMessage(`❌ Error saving credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const [linkedInAccessToken, setLinkedInAccessToken] = useState('');
  const [linkedInUserId, setLinkedInUserId] = useState('');
  const [isCompanyPage, setIsCompanyPage] = useState(false);
  const [isValidatingLinkedIn, setIsValidatingLinkedIn] = useState(false);

  const validateLinkedInCredentials = async () => {
    if (!linkedInAccessToken.trim()) {
      setLinkedInValidationStatus('invalid');
      setLinkedInValidationMessage('Please enter a LinkedIn Access Token');
      return;
    }

    if (!linkedInUserId.trim()) {
      setLinkedInValidationStatus('invalid');
      setLinkedInValidationMessage('Please enter a LinkedIn User/Company ID');
      return;
    }

    setIsValidatingLinkedIn(true);
    setLinkedInValidationStatus('idle');
    setLinkedInValidationMessage('');

    try {
      const { validateLinkedInCredentials } = await import('../api/linkedin');
      const validation = await validateLinkedInCredentials(linkedInAccessToken, linkedInUserId, isCompanyPage);
      
      if (validation.success) {
        setLinkedInValidationStatus('valid');
        const profileName = isCompanyPage 
          ? validation.profile?.localizedName || validation.profile?.name || 'Company'
          : `${validation.profile?.firstName?.localized?.en_US || 'Unknown'} ${validation.profile?.lastName?.localized?.en_US || ''}`;
        setLinkedInValidationMessage(`✅ Valid LinkedIn credentials! ${isCompanyPage ? 'Company' : 'Profile'}: ${profileName}`);
      } else {
        setLinkedInValidationStatus('invalid');
        setLinkedInValidationMessage(`❌ ${validation.error || 'Invalid LinkedIn credentials'}`);
      }
    } catch (error) {
      setLinkedInValidationStatus('invalid');

  const saveLinkedInCredentials = async () => {
    if (!currentUser) return;
    
    if (!linkedInAccessToken.trim() || !linkedInUserId.trim()) {
      setLinkedInValidationMessage('❌ Please enter both LinkedIn Access Token and User/Company ID');
      return;
    }

    setIsSavingLinkedIn(true);

    try {
      const credentialData = {
        type: 'linkedin',
        accessToken: linkedInAccessToken.trim(),
        linkedInUserId: linkedInUserId.trim(),
        isCompanyPage: isCompanyPage,
        createdAt: new Date().toISOString(),
        lastValidated: new Date().toISOString()
      };

      await saveCredential(currentUser.uid, credentialData);

      // Auto-load LinkedIn credentials if they exist
      const linkedInCred = credentials.find(cred => cred.type === 'linkedin');
      if (linkedInCred) {
        setLinkedInAccessToken(linkedInCred.accessToken || '');
        setLinkedInUserId(linkedInCred.linkedInUserId || '');
        setIsCompanyPage(linkedInCred.isCompanyPage || false);
      }

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User/Company ID *
                  </label>
                  <input
                    type="text"
                    value={linkedInUserId}
                    onChange={(e) => setLinkedInUserId(e.target.value)}
                    placeholder="Enter LinkedIn User ID or Company ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isCompanyPage}
                      onChange={(e) => setIsCompanyPage(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">This is a Company Page</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Check this if you're posting to a LinkedIn Company Page instead of a personal profile
                  </p>
                </div>

                {/* LinkedIn Action Buttons */}
                <div className="flex space-x-2">
                  <button

                  <button
                    onClick={saveLinkedInCredentials}
                    disabled={isSavingLinkedIn || !linkedInAccessToken.trim() || !linkedInUserId.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-800 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                  >
                    {isSavingLinkedIn ? 'Saving...' : 'Save'}

           {/* LinkedIn Permissions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">LinkedIn Permissions</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <code className="bg-blue-100 px-2 py-1 rounded text-xs">r_liteprofile</code> - Read profile info
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <code className="bg-blue-100 px-2 py-1 rounded text-xs">w_member_social</code> - Post on behalf of user
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <code className="bg-blue-100 px-2 py-1 rounded text-xs">r_organization_social</code> - Read company info
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <code className="bg-blue-100 px-2 py-1 rounded text-xs">w_organization_social</code> - Post on behalf of company
                </li>
              </ul>
              <p className="text-xs text-blue-600 mt-3">