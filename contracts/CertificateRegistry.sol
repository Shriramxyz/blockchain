// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CertificateRegistry
/// @notice Stores SHA-256 fingerprints of certificates issued by authorized institutions.
///         Anyone can verify a certificate by hashing the file and querying the registry.
contract CertificateRegistry {
    struct Certificate {
        bytes32 hash;        // SHA-256 of the certificate file
        address issuer;      // account that registered it
        uint64 issuedAt;
        uint64 revokedAt;    // 0 if not revoked
        string recipient;
        string title;
        string institution;
        string revokeReason;
    }

    address public owner;
    mapping(address => bool) public isIssuer;
    mapping(bytes32 => Certificate) private certs;
    uint256 public totalIssued;

    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    event CertificateIssued(bytes32 indexed hash, address indexed issuer, string recipient, string title);
    event CertificateRevoked(bytes32 indexed hash, address indexed by, string reason);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotIssuer();
    error NotAuthorizedToRevoke();
    error AlreadyIssued();
    error NotFound();
    error AlreadyRevoked();
    error EmptyField();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyIssuer() {
        if (!isIssuer[msg.sender]) revert NotIssuer();
        _;
    }

    constructor() {
        owner = msg.sender;
        isIssuer[msg.sender] = true; // deployer can issue by default
        emit IssuerAdded(msg.sender);
    }

    // ---------- Administration ----------

    function addIssuer(address a) external onlyOwner {
        if (a == address(0)) revert ZeroAddress();
        isIssuer[a] = true;
        emit IssuerAdded(a);
    }

    function removeIssuer(address a) external onlyOwner {
        isIssuer[a] = false;
        emit IssuerRemoved(a);
    }

    function transferOwnership(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, to);
        owner = to;
    }

    // ---------- Issuing ----------

    function issue(
        bytes32 hash,
        string calldata recipient,
        string calldata title,
        string calldata institution
    ) external onlyIssuer {
        _issue(hash, recipient, title, institution);
    }

    function issueBatch(
        bytes32[] calldata hashes,
        string[] calldata recipients,
        string calldata title,
        string calldata institution
    ) external onlyIssuer {
        require(hashes.length == recipients.length, "Length mismatch");
        for (uint256 i = 0; i < hashes.length; i++) {
            _issue(hashes[i], recipients[i], title, institution);
        }
    }

    function _issue(
        bytes32 hash,
        string calldata recipient,
        string calldata title,
        string calldata institution
    ) private {
        if (hash == bytes32(0) || bytes(recipient).length == 0 || bytes(title).length == 0) revert EmptyField();
        if (certs[hash].issuedAt != 0) revert AlreadyIssued();
        certs[hash] = Certificate(hash, msg.sender, uint64(block.timestamp), 0, recipient, title, institution, "");
        totalIssued++;
        emit CertificateIssued(hash, msg.sender, recipient, title);
    }

    // ---------- Revocation ----------

    function revoke(bytes32 hash, string calldata reason) external {
        Certificate storage c = certs[hash];
        if (c.issuedAt == 0) revert NotFound();
        if (msg.sender != c.issuer && msg.sender != owner) revert NotAuthorizedToRevoke();
        if (c.revokedAt != 0) revert AlreadyRevoked();
        c.revokedAt = uint64(block.timestamp);
        c.revokeReason = reason;
        emit CertificateRevoked(hash, msg.sender, reason);
    }

    // ---------- Verification ----------

    /// @return exists  true if the hash was ever registered
    /// @return valid   true if registered and not revoked
    /// @return cert    full record (empty if not found)
    function verify(bytes32 hash) external view returns (bool exists, bool valid, Certificate memory cert) {
        cert = certs[hash];
        exists = cert.issuedAt != 0;
        valid = exists && cert.revokedAt == 0;
    }
}
