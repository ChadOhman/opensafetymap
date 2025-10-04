<?php
function generate_random_username($pdo) {
    $adjectives1 = [
        "brave","curious","gentle","proud","kind","clever","happy","calm","bold","silly",
        "mighty","noble","graceful","swift","wise","bright","fierce","loyal","playful","shy",
        "stubborn","quiet","eager","caring","funny","fearless","optimistic","serene","tough","friendly"
    ];

    $adjectives2 = [
        "fluffy","fuzzy","frosty","stormy","velvet","silky","tiny","grand","golden","shadow",
        "misty","cosmic","crystal","scarlet","emerald","ivory","onyx","silver","jade","amber",
        "cobalt","frozen","lunar","solar","wild","ancient","frostbitten","radiant","thunder","obsidian"
    ];

    $nouns = [
        "lion","tiger","panther","wolf","fox","bear","otter","eagle","hawk","falcon",
        "owl","panda","koala","jaguar","cheetah","leopard","lynx","falcon","raven","phoenix",
        "unicorn","griffin","dragon","serpent","dolphin","orca","whale","shark","rhino","elephant",
        "moose","elk","buffalo","stag","antelope","zebra","giraffe","camel","ferret","badger"
    ];

    do {
        $username = ucfirst($adjectives1[array_rand($adjectives1)]) . " " .
                    ucfirst($adjectives2[array_rand($adjectives2)]) . " " .
                    ucfirst($nouns[array_rand($nouns)]);

        // ensure uniqueness
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username=?");
        $stmt->execute([$username]);
    } while ($stmt->fetch());

    return $username;
}
