import twilio from "twilio";

// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = "AC9725c37ffab58bd10e0aedb5b7b5b139";
const authToken = "453fe4a93ee98e44e39ba98e079d6742";
const client = twilio(accountSid, authToken);

async function createCall() {
  const call = await client.calls.create({
    from: "+15675871891",
    to: "+919801441675",
    url: "http://demo.twilio.com/docs/voice.xml",
  });

  console.log(call.sid);
}

createCall();