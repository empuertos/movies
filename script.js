// Wait for the HTML document to be fully loaded and parsed
document.addEventListener('DOMContentLoaded', () => {
    
    // Find the element with the ID 'copyright-year'
    const copyrightElement = document.getElementById('copyright-year');
    
    if (copyrightElement) {
        // Get the current year
        const currentYear = new Date().getFullYear();
        
        // Update the text content of the element
        copyrightElement.textContent = `© ${currentYear} Your Company. All rights reserved.`;
    }

    console.log("Page loaded and script is running!");

});
