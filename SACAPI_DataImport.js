(function () {

    let accessToken, csrfToken, jobUrl, validateJobURL, runJobURL;
    const csrfTokenUrl = 'https://a2pp-1.eu10.hcs.cloud.sap/api/v1/csrf';
    const clientId = 'sb-2ce9dd0e-27e0-4897-87e3-2b765bc0276c!b498618|client!b3650';
    const clientSecret = '125e7bc7-5075-471b-adbe-df8793284e36$B2-jpvtouP9h0UUG-UtK9DyKDmGhS-M2tZ8NcBDw900=';
    const tokenUrl = 'https://a2pp-1.authentication.eu10.hana.ondemand.com/oauth/token';
    const apiEndpoint = 'https://a2pp-1.eu10.hcs.cloud.sap/api/v1/dataimport/models/Cag4sr05ulut226peu51e8vqn5f/factData';
    
    const jobSettings = {
        "Mapping": {
            "Version": "Version",
            "Date": "Date",
            "StartDate": "StartDate",
            "EndDate": "EndDate",
            "ID": "ID",
            "Label": "Label",
            "Open": "Open",
            "Progress": "Progress"
        },
        "JobSettings": {
            "importMethod": "Update",
            "dateFormats": { 
                "Date": "YYYY-MM-DD", 
                "StartDate": "YYYY-MM-DD", 
                "EndDate": "YYYY-MM-DD"
             }
        }
    };

    const fetchWithTimeout = (url, options, timeout = 60000) => {
      return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), timeout)
        )
      ]);
    };

    function getAccessToken(messagesElement) {
        return fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`
        })
            .then(response => response.json())
            .then(data => {
                accessToken = data.access_token;
                //console.log('Access token:', accessToken);
                if (messagesElement) {
                    messagesElement.textContent = '';  // Clear the messages
                    messagesElement.textContent += 'Access token: ' + accessToken + '\n';
                }
            })

            .catch(error => console.error('Error:', error));
    }
    window.getAccessToken = getAccessToken;

    
    function getCsrfToken(messagesElement) {
        if (!accessToken) {
            console.log('Access token is not set');
            return;
        }

        return fetch(csrfTokenUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': 'fetch',
                'x-sap-sac-custom-auth': 'true'
            }
        })
            .then(response => {
                csrfToken = response.headers.get('x-csrf-token');
                //console.log('CSRF token:', csrfToken);
                if (messagesElement) {
                    messagesElement.textContent = '';  // Clear the messages
                    messagesElement.textContent += 'CSRF token: ' + csrfToken + '\n';
                }

            })
            .catch(error => console.error('Error:', error));
    }
    window.getCsrfToken = getCsrfToken;
    

    function createJob(messagesElement) {
        console.log(accessToken);
        console.log(csrfToken);
        if (!accessToken || !csrfToken) {
            console.log('Access token or CSRF token is not set');
            return;
        }

        return fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': csrfToken,
                'x-sap-sac-custom-auth': 'true'
            },
            body: JSON.stringify(jobSettings)
        })
            .then(response => {
                console.log(response);  // Log the raw response object.
                return response.json();
            })
            .then(data => {
                jobUrl = data.jobURL;
                console.log('Job URL:', jobUrl);
                if (messagesElement) {
                    messagesElement.textContent = '';  // Clear the messages
                    messagesElement.textContent += 'Job URL: ' + jobUrl + '\n';
                }

            })
            .catch(error => console.error('Error:', error));
    }
    window.createJob = createJob;

    
    function uploadData(csvData) {
        console.log('uploadData is triggered');
        console.log('accessToken:', accessToken);
        console.log('csrfToken:', csrfToken);
        console.log('jobUrl:', jobUrl);
        if (!accessToken || !csrfToken || !jobUrl) {
            console.log('Access token, CSRF token, or job URL is not set');
            return;
        }
        console.log('csvData:', csvData);
        return fetch(jobUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/csv',
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': csrfToken,
                'x-sap-sac-custom-auth': 'true'
            },
            body: csvData
        })
            .then(response => {
                console.log('Response:', response);  // Log the raw response object.
                return response.json();
            })
            .then(data => {
                console.log('Data:',data);
                validateJobURL = data.validateJobURL;
                runJobURL = data.runJobURL;
                console.log('Validate job URL:', validateJobURL);
                console.log('Run job URL:', runJobURL);
            })
            .catch(error => console.error('Error:', error));
    }
    window.uploadData = uploadData;

    
    function validateJob(messagesElement) {
        if (!accessToken || !csrfToken || !validateJobURL) {
            console.log('Access token, CSRF token, or validate job URL is not set');
            return Promise.reject('Missing required tokens or URL');
        }
    
        console.log('Sending request to:', validateJobURL);
        console.log('With headers:', {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken.substring(0, 10)}...`,
            'x-csrf-token': csrfToken,
            'x-sap-sac-custom-auth': 'true'
        });
    
        return fetchWithTimeout(validateJobURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': csrfToken,
                'x-sap-sac-custom-auth': 'true'
            }
            // Removed body: JSON.stringify(jobSettings)
        }, 180000)  // Increased timeout to 3 minutes
        .then(response => {
            if (!response.ok) {
                throw response;  // Throw the entire response object for more details
            }
            return response.text();
        })
        .then(text => {
            console.log('Raw response:', text);
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse JSON:', e);
                throw new Error('Invalid JSON in response');
            }
        })
        .then(data => {
            console.log('Job validation response:', data);
            if (data.failedNumberRows > 0) {
                console.warn(`${data.failedNumberRows} rows failed validation`);
                // Handle failed rows...
            }
            return data;  // Return the data for the next then block
        })
        .catch(error => {
            console.error('Validation Error:', error);
            if (error.text) {  // If it's a response object
                return error.text().then(text => {
                    console.error('Error response body:', text);
                    if (messagesElement) {
                        messagesElement.textContent = 'Validation Error: ' + text;
                    }
                });
            } else {
                if (messagesElement) {
                    messagesElement.textContent = 'Validation Error: ' + error.message;
                }
            }
            throw error;  // Rethrow the error to stop the chain
        });
    }
    window.validateJob = validateJob;
    
    function runJob(messagesElement) {
        if (!accessToken || !csrfToken || !runJobURL) {
            console.log('Access token, CSRF token, or run job URL is not set');
            return Promise.reject('Missing required tokens or URL');
        }
    
        return fetchWithTimeout(runJobURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': csrfToken,
                'x-sap-sac-custom-auth': 'true'
            }
        }, 120000)
        .then(response => {
            if (!response.ok) {
                if (response.status === 412) {
                    throw new Error('Precondition Failed: Job validation may have failed');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Job run response:', data);
            if (data.jobStatusURL) {
                return checkJobStatus(data.jobStatusURL);
            } else {
                throw new Error('No job status URL provided');
            }
        })
        .catch(error => {
            console.error('Job Run Error:', error);
            if (messagesElement) {
                messagesElement.textContent = 'Job Run Error: ' + error.message;
            }
            throw error;
        });
    }
    
    function checkJobStatus(statusURL) {
        return fetchWithTimeout(statusURL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': csrfToken,
                'x-sap-sac-custom-auth': 'true'
            }
        }, 60000)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Job status:', data);
            return data;
        });
    }
    window.runJob = runJob;




})();
