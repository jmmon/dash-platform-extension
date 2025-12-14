# keyboard navigation:
- when preparing tx, allow tabbing to select target username from dropdown list
- check on header buttons; seems to (on one page at least) not tab down to Create button etc 
- when only one button on page, autofocus??? so long as user can shift-tab back up to header buttons


Your wallet was successfully created 
autofocus



seed vs key store (or wahtever it is)
- need focus border/indication





# TO TEST:
## send transaction - "next" button
## name registration - step 1 and step 2
## "identity type" import
## "import masternode identity"


### add identity button
~- autofocus~
- tabbing works as expected!

### choose what identity type you will add
~- regular, masternode~
~~- tabbable options! only the back button is tabbable!~~
~> - now it works after setting button type to button for other buttons~
~enter to select then enter again to go Next (instead of tabbing down to the Next button)~
- focus indication works as expected!! and tabbable and enter to submit!
> - this actually has nice indication AFTER selected!!!

~> regular~
~>> add more private keys~
~>> autofocus the private key input~
- import private keys for regular identity works as expected, autofocus and enter to submit!

~> masternode~
~>> "Pro TX Hash" autofocus!~~
~>> below "Payout Key (optional)"~
~>> - make sure submit ('check'?) button runs on enter~
- import masternode identity form works as expected, autofocus and enter to submit!

### settings menu
- needs tab trap
