document.forms[0].onsubmit = function(e) {
    e.preventDefault(); // Prevent submission
    let inputtext = document.getElementById('inputtext').value;
    chrome.tabs.query({active:true}, async function(tabs){
        tabs.forEach(tab => {
            if(tab.title.includes('WhatsApp')) {
                let response = chrome.tabs.sendMessage(tab.id, {type:'encrypt', message:inputtext});
                window.close();
            }
        });
    });
};