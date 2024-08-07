(function () {
    let accessToken, csrfToken, namespaceID, providerID;
    const tokenUrl = 'https://a2pp-1.authentication.eu10.hana.ondemand.com/oauth/token';
    const apiBaseUrl = 'https://a2pp-1.eu10.hcs.cloud.sap/api/v1/dataexport';

    const clientId = 'sb-2ce9dd0e-27e0-4897-87e3-2b765bc0276c!b498618|client!b3650';
    const clientSecret = '125e7bc7-5075-471b-adbe-df8793284e36$B2-jpvtouP9h0UUG-UtK9DyKDmGhS-M2tZ8NcBDw900=';

    async function getAccessToken() {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`
        });
        const data = await response.json();
        accessToken = data.access_token;
        console.log('Access token acquired');
    }
    window.getAccessToken = getAccessToken;

    async function getCsrfToken() {
        const response = await fetch(`${apiBaseUrl}/csrf`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': 'fetch'
            }
        });
        csrfToken = response.headers.get('x-csrf-token');
        console.log('CSRF token acquired');
    }
    window.getCsrfToken = getCsrfToken;

    async function getProviders() {
        const response = await fetch(`${apiBaseUrl}/administration/Namespaces`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();
        console.log('Available namespaces:', data);
        // You would typically select a namespace here
        namespaceID = data.value[0].NamespaceID;  // Example: selecting the first namespace

        const providersResponse = await fetch(`${apiBaseUrl}/administration/Namespaces(NamespaceID='${namespaceID}')/Providers`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const providersData = await providersResponse.json();
        console.log('Available providers:', providersData);
        // You would typically select a provider here
        providerID = providersData.value[0].ProviderID;  // Example: selecting the first provider
    }
    window.getProviders = getProviders;

    async function createSubscription() {
        const response = await fetch(`${apiBaseUrl}/administration/Subscriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': csrfToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                NamespaceID: namespaceID,
                ProviderID: providerID,
                EntitySetName: 'FactData'
            })
        });
        const data = await response.json();
        console.log('Subscription created:', data);
        return data.SubscriptionID;
    }
    window.createSubscription = createSubscription;

    async function getExportedData() {
        const response = await fetch(`${apiBaseUrl}/providers/${namespaceID}/${providerID}/FactData`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();
        console.log('Exported data:', data);
        return data;
    }
    window.getExportedData = getExportedData;

})();
