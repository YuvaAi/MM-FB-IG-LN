// LinkedIn API Integration
export interface LinkedInPostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export interface LinkedInProfile {
  id: string;
  firstName?: {
    localized: { [key: string]: string };
  };
  lastName?: {
    localized: { [key: string]: string };
  };
}

// Publish content to LinkedIn using LinkedIn API v2
export async function publishToLinkedIn(
  content: string,
  linkedInUserId: string,
  accessToken: string,
  isCompanyPage: boolean = false
): Promise<LinkedInPostResult> {
  try {
    console.log('💼 Starting LinkedIn posting process...');
    console.log('LinkedIn User/Company ID:', linkedInUserId);
    console.log('Content length:', content.length);
    console.log('Is Company Page:', isCompanyPage);

    // Determine the author URN based on whether it's a company page or personal profile
    const authorUrn = isCompanyPage 
      ? `urn:li:organization:${linkedInUserId}`
      : `urn:li:person:${linkedInUserId}`;

    console.log('Author URN:', authorUrn);

    // LinkedIn API endpoint for creating posts
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      })
    });

    const result = await response.json();
    console.log('📥 LinkedIn publish response status:', response.status);
    console.log('📥 LinkedIn publish response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('❌ LinkedIn publishing failed:', result);
      
      // Handle specific LinkedIn API errors
      let errorMessage = 'Failed to publish to LinkedIn';
      
      if (result.message) {
        errorMessage = result.message;
      } else if (result.error_description) {
        errorMessage = result.error_description;
      } else if (result.error) {
        errorMessage = typeof result.error === 'string' ? result.error : result.error.message || 'Unknown LinkedIn API error';
      }

      // Add specific error handling for common LinkedIn API issues
      if (response.status === 401) {
        errorMessage = 'LinkedIn access token is invalid or expired. Please re-authenticate.';
      } else if (response.status === 403) {
        errorMessage = 'Insufficient permissions to post to LinkedIn. Please check your app permissions.';
      } else if (response.status === 422) {
        errorMessage = 'Invalid request data. Please check the content format and user/company ID.';
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    // Extract post ID from LinkedIn response
    const postId = result.id || 'unknown';
    console.log('✅ LinkedIn post published successfully:', postId);

    return {
      success: true,
      postId: postId
    };

  } catch (error: any) {
    console.error('🔥 Error in LinkedIn posting:', error);
    return {
      success: false,
      error: error.message || 'Network error while posting to LinkedIn'
    };
  }
}

// Validate LinkedIn credentials and get profile information
export async function validateLinkedInCredentials(
  accessToken: string,
  linkedInUserId: string,
  isCompanyPage: boolean = false
): Promise<{ success: boolean; profile?: any; error?: string }> {
  try {
    console.log('🔍 Validating LinkedIn credentials...');
    console.log('User/Company ID:', linkedInUserId);
    console.log('Is Company Page:', isCompanyPage);

    let apiUrl: string;
    
    if (isCompanyPage) {
      // For company pages, use the organizations API
      apiUrl = `https://api.linkedin.com/v2/organizations/${linkedInUserId}?projection=(id,name,localizedName)`;
    } else {
      // For personal profiles, use the people API
      apiUrl = `https://api.linkedin.com/v2/people/(id:${linkedInUserId})?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))`;
    }

    console.log('API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('LinkedIn validation response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('❌ LinkedIn validation failed:', data);
      
      let errorMessage = 'Failed to validate LinkedIn credentials';
      
      if (response.status === 401) {
        errorMessage = 'LinkedIn access token is invalid or expired';
      } else if (response.status === 403) {
        errorMessage = 'Insufficient permissions to access LinkedIn profile/company';
      } else if (response.status === 404) {
        errorMessage = isCompanyPage 
          ? 'Company page not found or you don\'t have access to it'
          : 'LinkedIn profile not found or you don\'t have access to it';
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.error_description) {
        errorMessage = data.error_description;
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    console.log('✅ LinkedIn credentials validated successfully');
    return {
      success: true,
      profile: data
    };
  } catch (error: any) {
    console.error('🔥 Error validating LinkedIn credentials:', error);
    return {
      success: false,
      error: error.message || 'Network error while validating LinkedIn credentials'
    };
  }
}

// Get LinkedIn profile information
export async function getLinkedInProfile(accessToken: string): Promise<{ success: boolean; profile?: LinkedInProfile; error?: string }> {
  try {
    const response = await fetch(
      'https://api.linkedin.com/v2/people/~?projection=(id,firstName,lastName)',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error_description || 'Failed to get LinkedIn profile'
      };
    }

    return {
      success: true,
      profile: data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error while getting LinkedIn profile'
    };
  }
}