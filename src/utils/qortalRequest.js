// This is a wrapper for Qortal API requests
export const qortalRequest = async (params) => {
    // Wait for Qortal API to be available
    while (typeof window.qortal === 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
        return await window.qortal.request(params);
    } catch (error) {
        console.error('Qortal request failed:', error);
        throw error;
    }
};

// Get user account (returns address and other info)
export const getUserAccount = async () => {
    return await qortalRequest({ action: 'GET_USER_ACCOUNT' });
};


// Get base URL for resources
export const getResourceUrl = (service, name, identifier) => {
    return `/arbitrary/${service}/${encodeURIComponent(name)}/${encodeURIComponent(identifier)}`;
};

// Get thumbnail URL
export const getThumbnailUrl = (name, identifier) => {
    return `/arbitrary/THUMBNAIL/${encodeURIComponent(name)}/${encodeURIComponent(identifier)}`;
};
