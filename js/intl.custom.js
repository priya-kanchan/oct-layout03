/* Country code for every .phone-input.
   The selected dial code is written to the hidden input named in data-countrycode-id
   (e.g. qCountryCode4), which SubmitQueryData reads via SenderControlCountryCodeID. */
$(document).ready(function () {
  $(".phone-input").each(function () {
    var input = this;
    var output = $(this).siblings(".output");

    var iti = window.intlTelInput(input, {
      allowDropdown: true,
      separateDialCode: true,
      initialCountry: "in",
      preferredCountries: ["in", "ae", "us", "gb", "sg"],
      // The popup form lives in a modal <dialog> (top layer); a body-level fullscreen list would sit behind it.
      useFullscreenPopup: false,
      utilsScript: "js/utils.js"
    });

    var updateCountryCode = function () {
      var countryData = iti.getSelectedCountryData();
      var dialCode = countryData && countryData.dialCode ? "+" + countryData.dialCode : "+91";

      // 1. Hidden input named by data-countrycode-id
      var targetId = $(input).data("countrycode-id");
      if (targetId && $("#" + targetId).length) {
        $("#" + targetId).val(dialCode);
      }

      // 2. Hidden qCountryCode* input inside the same form group
      $(input).closest(".form-group")
        .find('input[type="hidden"][id^="qCountryCode"], input[type="hidden"][name^="qCountryCode"]')
        .val(dialCode);
    };

    updateCountryCode();

    // Digits only, so the API receives a clean number.
    $(input).on("input", function () {
      var clean = this.value.replace(/[^0-9]/g, "").slice(0, 15);
      if (clean !== this.value) this.value = clean;
    });

    $(input).on("change keyup blur countrychange", function () {
      if (output.length) {
        output.text(input.value ? (iti.isValidNumber() ? "" : "Please enter a valid number") : "");
      }
      updateCountryCode();
    });
    input.addEventListener("countrychange", updateCountryCode);
  });
});
