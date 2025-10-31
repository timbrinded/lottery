# Minimum Participants Decision

## Question
Should we require minimum 1 or 2 committed tickets for reveal?

## Decision: Minimum 1 Ticket

### Reasoning

**With 1 Committed Ticket:**
- Creator still doesn't know WHICH ticket will commit before the deadline
- Creator secret + 1 ticket hash provides sufficient entropy
- Even if creator knows all ticket secrets (they generated them), they don't know which one will be redeemed/committed
- Allows lotteries to proceed even with low participation

**Security Analysis:**

```
Entropy = hash(creatorSecret || ticketHash[committedIndex])
```

- Creator knows: creatorSecret, all ticketHashes
- Creator doesn't know: which ticket index will commit
- Result: Creator cannot predict the random seed before commit deadline

**Example:**
1. Creator generates 100 tickets with secrets
2. Creator distributes tickets to 100 people
3. Only 1 person commits their ticket (say, ticket #47)
4. Creator doesn't know it's ticket #47 until after commit deadline
5. Random seed = hash(creatorSecret || ticketHash[47])
6. Creator couldn't predict this before deadline

### When This Matters

**Low Participation Scenario:**
- Small lottery with 10 tickets
- Only 1 person commits
- Without minimum=1: Lottery fails, creator must refund
- With minimum=1: Lottery proceeds, that 1 person wins a prize

**High Participation Scenario:**
- Large lottery with 100 tickets
- 50 people commit
- Both minimum=1 and minimum=2 work fine
- More entropy with more participants

### Attack Vectors

**Could creator collude with 1 participant?**
- Yes, but they could also collude with 2+ participants
- Collusion requires active coordination (harder than timing manipulation)
- If creator wants to rig it, they'd need to:
  1. Know which specific person will commit
  2. Coordinate with that person
  3. Both parties agree on outcome
- This is detectable and requires trust between parties

**Could creator commit their own ticket?**
- Yes, but they still don't know which OTHER tickets will commit
- If only creator commits: They win their own prize (pointless)
- If creator + 1 other commits: Still 50/50 chance, creator can't predict

### Comparison

| Minimum | Pros | Cons |
|---------|------|------|
| 0 | Always proceeds | No entropy, creator controls outcome |
| 1 | Sufficient entropy, allows low participation | Slight collusion risk |
| 2 | More entropy, harder collusion | Fails with low participation |
| 3+ | Maximum entropy | Often fails, poor UX |

### Conclusion

**Minimum 1 ticket is the right balance:**
- ✅ Sufficient security for small-medium lotteries
- ✅ Better UX (doesn't fail with low participation)
- ✅ Creator still can't predict outcome
- ✅ Collusion requires active coordination (detectable)
- ⚠️ Not suitable for high-value lotteries (use VRF instead)

### Implementation

```solidity
// Require at least 1 committed ticket
if (committedCount < 1) {
    revert InsufficientCommittedTickets();
}
```

### When to Upgrade

For lotteries with:
- Prize pools > $10,000
- Regulatory requirements
- High-value NFTs
- Casino/gambling applications

→ Use Chainlink VRF or similar cryptographic randomness
